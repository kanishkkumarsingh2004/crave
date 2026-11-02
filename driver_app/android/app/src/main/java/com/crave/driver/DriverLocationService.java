package com.crave.driver;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

public class DriverLocationService extends Service implements LocationListener {
    public static final String ACTION_START = "com.crave.driver.location.START";
    public static final String ACTION_UPDATE = "com.crave.driver.location.UPDATE";
    public static final String ACTION_STOP = "com.crave.driver.location.STOP";
    public static final String EXTRA_TOKEN = "token";
    public static final String EXTRA_DRIVER_ID = "driverId";
    public static final String EXTRA_API_BASE_URL = "apiBaseUrl";
    public static final String EXTRA_ORDER_ID = "activeOrderId";
    public static final String EXTRA_VEHICLE_TYPE = "vehicleType";

    private static final String CHANNEL_ID = "driver-location";
    private static final String ORDER_CHANNEL_ID = "driver-orders";
    private static final int NOTIFICATION_ID = 2201;
    private static final long LOCATION_INTERVAL_MS = 5_000L;
    private static final float MIN_DISTANCE_METERS = 5f;
    private static final String PREFS_NAME = "driver_location_service";
    private static final String CAPACITOR_PREFS_NAME = "CapacitorStorage";
    private static final long OFFER_POLL_INTERVAL_MS = 15_000L;

    private final ExecutorService uploadExecutor = Executors.newSingleThreadExecutor();
    private LocationManager locationManager;
    private SharedPreferences preferences;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private volatile boolean uploadInProgress;
    private volatile boolean offerPollInProgress;
    private volatile long lastUploadAt;
    private final Runnable offerPoller = new Runnable() {
        @Override
        public void run() {
            pollDeliveryOffers();
            mainHandler.postDelayed(this, OFFER_POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopTracking();
            return START_NOT_STICKY;
        }
        // Both START and UPDATE persist configuration and (re)start tracking.
        // UPDATE is called when the active order changes mid-trip without stopping the service.
        if (intent != null) persistConfiguration(intent);
        startForeground(NOTIFICATION_ID, buildNotification());
        startLocationUpdates();
        mainHandler.removeCallbacks(offerPoller);
        mainHandler.post(offerPoller);
        return START_STICKY;
    }

    private void persistConfiguration(Intent intent) {
        SharedPreferences.Editor editor = preferences.edit();
        putIfPresent(editor, "token", intent.getStringExtra(EXTRA_TOKEN));
        putIfPresent(editor, "driverId", intent.getStringExtra(EXTRA_DRIVER_ID));
        putIfPresent(editor, "apiBaseUrl", intent.getStringExtra(EXTRA_API_BASE_URL));
        putIfPresent(editor, "vehicleType", intent.getStringExtra(EXTRA_VEHICLE_TYPE));
        if (intent.hasExtra(EXTRA_ORDER_ID)) {
            String orderId = intent.getStringExtra(EXTRA_ORDER_ID);
            if (orderId == null || orderId.isBlank()) editor.remove("activeOrderId");
            else editor.putString("activeOrderId", orderId);
        }
        editor.apply();
    }

    private void putIfPresent(SharedPreferences.Editor editor, String key, String value) {
        if (value != null && !value.isBlank()) editor.putString(key, value);
    }

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED
            && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            stopTracking();
            return;
        }

        locationManager.removeUpdates(this);
        requestProvider(LocationManager.GPS_PROVIDER);
        requestProvider(LocationManager.NETWORK_PROVIDER);
    }

    private void requestProvider(String provider) {
        try {
            if (locationManager.isProviderEnabled(provider)) {
                locationManager.requestLocationUpdates(
                    provider,
                    LOCATION_INTERVAL_MS,
                    MIN_DISTANCE_METERS,
                    this
                );
                Location lastKnown = locationManager.getLastKnownLocation(provider);
                if (lastKnown != null && System.currentTimeMillis() - lastKnown.getTime() < 60_000L) {
                    uploadLocation(lastKnown);
                }
            }
        } catch (SecurityException ignored) {
            stopTracking();
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        uploadLocation(location);
    }

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    private void uploadLocation(Location location) {
        long now = System.currentTimeMillis();
        if (uploadInProgress || now - lastUploadAt < LOCATION_INTERVAL_MS) return;

        String token = preferences.getString("token", "");
        String driverId = preferences.getString("driverId", "");
        String apiBaseUrl = preferences.getString("apiBaseUrl", "");
        if (token.isBlank() || driverId.isBlank() || !apiBaseUrl.startsWith("https://")) return;

        uploadInProgress = true;
        lastUploadAt = now;
        uploadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String endpoint = apiBaseUrl.replaceAll("/+$", "") + "/api/driver/location";
                connection = (HttpURLConnection) new URL(endpoint).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(20_000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("X-Crave-Native-App", "driver");

                String orderId = preferences.getString("activeOrderId", "");
                JSONObject body = new JSONObject();
                body.put("driverId", driverId);
                if (!orderId.isBlank()) body.put("orderId", orderId);
                body.put("lat", location.getLatitude());
                body.put("lng", location.getLongitude());
                body.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
                body.put("timestamp", location.getTime());
                body.put("status", orderId.isBlank() ? "ONLINE" : "ON_TRIP");
                body.put("available", orderId.isBlank());
                body.put("vehicleType", preferences.getString("vehicleType", "EV_SCOOTER"));

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }
                int responseCode = connection.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED
                    || responseCode == HttpURLConnection.HTTP_FORBIDDEN) {
                    stopSelf();
                }
            } catch (Exception ignored) {
                // The next GPS fix retries automatically when connectivity returns.
            } finally {
                if (connection != null) connection.disconnect();
                uploadInProgress = false;
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Live driver location",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps your location connected while you are on duty");
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);

        NotificationChannel orderChannel = new NotificationChannel(
            ORDER_CHANNEL_ID,
            "Delivery offers",
            NotificationManager.IMPORTANCE_HIGH
        );
        orderChannel.setDescription("New delivery offers and active trip updates");
        orderChannel.enableVibration(true);
        getSystemService(NotificationManager.class).createNotificationChannel(orderChannel);
    }

    private void pollDeliveryOffers() {
        if (offerPollInProgress) return;
        SharedPreferences appPreferences = getSharedPreferences(
            CAPACITOR_PREFS_NAME,
            Context.MODE_PRIVATE
        );
        if (!"true".equals(appPreferences.getString("crave_driver_notifications_enabled", "false"))) {
            return;
        }

        String token = preferences.getString("token", "");
        String apiBaseUrl = preferences.getString("apiBaseUrl", "");
        if (token.isBlank() || !apiBaseUrl.startsWith("https://")) return;

        offerPollInProgress = true;
        uploadExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                String endpoint = apiBaseUrl.replaceAll("/+$", "") + "/api/driver/offers";
                connection = openAuthorizedGet(endpoint, token);
                int responseCode = connection.getResponseCode();
                boolean legacyResponse = responseCode == HttpURLConnection.HTTP_NOT_FOUND;
                if (legacyResponse) {
                    connection.disconnect();
                    endpoint = apiBaseUrl.replaceAll("/+$", "") + "/api/orders?available=true";
                    connection = openAuthorizedGet(endpoint, token);
                    responseCode = connection.getResponseCode();
                }
                if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED
                    || responseCode == HttpURLConnection.HTTP_FORBIDDEN) {
                    stopSelf();
                    return;
                }
                if (responseCode < 200 || responseCode >= 300) return;

                StringBuilder responseBody = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8)
                )) {
                    String line;
                    while ((line = reader.readLine()) != null) responseBody.append(line);
                }
                JSONArray offers = new JSONObject(responseBody.toString()).optJSONArray(
                    legacyResponse ? "orders" : "offers"
                );
                if (offers == null) return;

                Set<String> notified = new HashSet<>(
                    preferences.getStringSet("notifiedOfferIds", new HashSet<>())
                );
                boolean changed = false;
                for (int index = 0; index < offers.length(); index += 1) {
                    JSONObject offer = offers.optJSONObject(index);
                    if (offer == null) continue;
                    if (legacyResponse) {
                        String status = offer.optString("status", "");
                        boolean isOfferStatus = status.equals("sent_to_vendor")
                            || status.equals("preparing")
                            || status.equals("packing")
                            || status.equals("ready_for_pickup");
                        if (!isOfferStatus
                            || !"verified".equals(offer.optString("payment_status", ""))
                            || !offer.isNull("rider_id")) continue;
                    }
                    String orderId = offer.optString("id", "");
                    if (orderId.isBlank() || notified.contains(orderId)) continue;
                    notified.add(orderId);
                    changed = true;
                    JSONObject snapshot = offer.optJSONObject("financial_snapshot");
                    double payout = offer.optDouble("driverPayout", 0);
                    if (legacyResponse) {
                        payout = snapshot != null && snapshot.has("riderPayablePaise")
                            ? snapshot.optDouble("riderPayablePaise", 0) / 100
                            : offer.optDouble("driver_payout", offer.optDouble("delivery_fee", 30));
                    }
                    showOfferNotification(
                        orderId,
                        legacyResponse
                            ? offer.optString("restaurant_name", "Crave restaurant")
                            : offer.optString("restaurantName", "Crave restaurant"),
                        payout
                    );
                }
                if (changed) {
                    preferences.edit().putStringSet("notifiedOfferIds", notified).apply();
                }
            } catch (Exception ignored) {
                // Poll again when network connectivity recovers.
            } finally {
                if (connection != null) connection.disconnect();
                offerPollInProgress = false;
            }
        });
    }

    private HttpURLConnection openAuthorizedGet(String endpoint, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(20_000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("X-Crave-Native-App", "driver");
        return connection;
    }

    private void showOfferNotification(String orderId, String restaurantName, double payout) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return;

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openApp.putExtra("tab", "home");
        openApp.putExtra("orderId", orderId);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            orderId.hashCode(),
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        String payoutText = payout > 0 ? " · ₹" + Math.round(payout) : "";
        Notification notification = new NotificationCompat.Builder(this, ORDER_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_crave)
            .setContentTitle("New delivery" + payoutText)
            .setContentText(restaurantName + " · Tap to review the trip")
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build();
        NotificationManagerCompat.from(this).notify(
            Math.max(1, orderId.hashCode() & 0x7fffffff),
            notification
        );
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_crave)
            .setContentTitle("Crave Driver is live")
            .setContentText("Sharing your location while you are on duty")
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void stopTracking() {
        mainHandler.removeCallbacks(offerPoller);
        if (locationManager != null) locationManager.removeUpdates(this);
        if (preferences != null) preferences.edit().clear().apply();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(offerPoller);
        if (locationManager != null) locationManager.removeUpdates(this);
        uploadExecutor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
