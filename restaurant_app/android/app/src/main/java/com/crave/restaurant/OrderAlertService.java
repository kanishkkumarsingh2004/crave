package com.crave.restaurant;

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
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * OrderAlertService — restaurant app background foreground service.
 *
 * Runs as a foreground service (with a low-priority persistent notification)
 * so the OS keeps it alive. Polls /api/orders?restaurantId=... every 15 s
 * and fires a high-priority local notification for each new incoming order,
 * allowing kitchen staff to act immediately even when the tablet/phone is
 * locked or the app is in the background.
 *
 * The service is always-on while the restaurant is open (the JS layer calls
 * start() when the restaurant logs in and stop() on logout/close).
 */
public class OrderAlertService extends Service {
    public static final String ACTION_START         = "com.crave.restaurant.orders.START";
    public static final String ACTION_STOP          = "com.crave.restaurant.orders.STOP";
    public static final String EXTRA_TOKEN          = "token";
    public static final String EXTRA_RESTAURANT_ID  = "restaurantId";
    public static final String EXTRA_API_BASE_URL   = "apiBaseUrl";

    private static final String CHANNEL_ONGOING = "restaurant-service";
    private static final String CHANNEL_ALERTS  = "restaurant-new-orders";
    private static final int    NOTIFICATION_ID  = 4401;
    private static final long   POLL_INTERVAL_MS = 15_000L;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler  = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private volatile boolean polling;

    /** Order IDs we have already notified about — prevents duplicate alerts. */
    private final Set<String> notifiedIds = new HashSet<>();

    private final Runnable pollTask = new Runnable() {
        @Override public void run() {
            poll();
            handler.postDelayed(this, POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("order_alert_service", Context.MODE_PRIVATE);
        createNotificationChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            shutdown();
            return START_NOT_STICKY;
        }
        if (intent != null) persistConfig(intent);
        startForeground(NOTIFICATION_ID, buildOngoingNotification());
        // Restore already-notified IDs from prefs so we survive a service restart.
        notifiedIds.addAll(prefs.getStringSet("notifiedIds", new HashSet<>()));
        handler.removeCallbacks(pollTask);
        handler.post(pollTask);
        return START_STICKY;
    }

    private void persistConfig(Intent intent) {
        SharedPreferences.Editor ed = prefs.edit();
        String token  = intent.getStringExtra(EXTRA_TOKEN);
        String restId = intent.getStringExtra(EXTRA_RESTAURANT_ID);
        String base   = intent.getStringExtra(EXTRA_API_BASE_URL);
        if (token  != null && !token.isBlank())  ed.putString("token", token);
        if (restId != null && !restId.isBlank())  ed.putString("restaurantId", restId);
        if (base   != null && !base.isBlank())    ed.putString("apiBaseUrl", base);
        ed.apply();
    }

    private void poll() {
        if (polling) return;
        String token        = prefs.getString("token", "");
        String restaurantId = prefs.getString("restaurantId", "");
        String apiBaseUrl   = prefs.getString("apiBaseUrl", "");
        if (token.isBlank() || restaurantId.isBlank() || !apiBaseUrl.startsWith("https://")) return;

        polling = true;
        executor.execute(() -> {
            try {
                String endpoint = apiBaseUrl.replaceAll("/+$", "")
                        + "/api/orders?restaurantId=" + restaurantId + "&status=pending";
                HttpURLConnection conn = openGet(endpoint, token);
                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_UNAUTHORIZED
                        || code == HttpURLConnection.HTTP_FORBIDDEN) {
                    shutdown();
                    return;
                }
                if (code < 200 || code >= 300) return;

                StringBuilder sb = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                }

                JSONObject root = new JSONObject(sb.toString());
                JSONArray orders = root.optJSONArray("orders");
                if (orders == null) orders = root.optJSONArray("data");
                if (orders == null) return;

                boolean changed = false;
                for (int i = 0; i < orders.length(); i++) {
                    JSONObject o = orders.optJSONObject(i);
                    if (o == null) continue;
                    String orderId = o.optString("id", "");
                    if (orderId.isBlank() || notifiedIds.contains(orderId)) continue;
                    notifiedIds.add(orderId);
                    changed = true;
                    notifyNewOrder(orderId, o);
                }
                if (changed) {
                    prefs.edit().putStringSet("notifiedIds", new HashSet<>(notifiedIds)).apply();
                }
            } catch (Exception ignored) {
                // Network failure — retry on next tick.
            } finally {
                polling = false;
            }
        });
    }

    private void notifyNewOrder(String orderId, JSONObject order) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                   != PackageManager.PERMISSION_GRANTED) return;

        String shortId  = orderId.length() > 6 ? orderId.substring(orderId.length() - 6).toUpperCase() : orderId.toUpperCase();
        double totalRaw = order.optDouble("total_amount", order.optDouble("total", 0));
        // total_amount_paise takes priority (canonical field)
        long paise      = order.optLong("total_amount_paise", 0);
        String amount   = paise > 0
                ? "₹" + (paise / 100)
                : (totalRaw > 0 ? "₹" + Math.round(totalRaw) : "");
        int itemCount   = order.optInt("item_count", 0);
        String itemText = itemCount > 0 ? itemCount + " item" + (itemCount > 1 ? "s" : "") : "New order";

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("orderId", orderId);
        PendingIntent pi = PendingIntent.getActivity(this, orderId.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String title = "New order #" + shortId + (amount.isEmpty() ? "" : " · " + amount);
        String body  = itemText + " · Tap to accept";

        Notification n = new NotificationCompat.Builder(this, CHANNEL_ALERTS)
                .setSmallIcon(R.drawable.ic_stat_crave)
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();
        NotificationManagerCompat.from(this)
                .notify(Math.max(1, orderId.hashCode() & 0x7fffffff), n);
    }

    // ── Notification helpers ─────────────────────────────────────────────────

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);

        NotificationChannel ongoing = new NotificationChannel(
                CHANNEL_ONGOING, "Restaurant service", NotificationManager.IMPORTANCE_LOW);
        ongoing.setDescription("Keeps the restaurant app connected in the background");
        ongoing.setShowBadge(false);
        nm.createNotificationChannel(ongoing);

        NotificationChannel alerts = new NotificationChannel(
                CHANNEL_ALERTS, "New order alerts", NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("Alerts for new incoming customer orders");
        alerts.enableVibration(true);
        alerts.enableLights(true);
        nm.createNotificationChannel(alerts);
    }

    private Notification buildOngoingNotification() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ONGOING)
                .setSmallIcon(R.drawable.ic_stat_crave)
                .setContentTitle("crave. Restaurant")
                .setContentText("Waiting for new orders…")
                .setContentIntent(pi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private HttpURLConnection openGet(String endpoint, String token) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(endpoint).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(15_000);
        conn.setReadTimeout(20_000);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("X-Crave-Native-App", "restaurant");
        return conn;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    private void shutdown() {
        handler.removeCallbacks(pollTask);
        prefs.edit().clear().apply();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(pollTask);
        executor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
