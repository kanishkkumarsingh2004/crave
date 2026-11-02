package com.crave.customer;

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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * OrderPollingService — customer app background foreground service.
 *
 * Runs as a foreground service with a low-priority ongoing notification so the
 * OS does not kill it while the customer has an active order. Polls
 * /api/orders every 20 seconds and fires a local notification when the order
 * status changes (preparing → ready → out_for_delivery → delivered).
 *
 * The service is self-stopping: it shuts down once no active orders remain.
 */
public class OrderPollingService extends Service {
    public static final String ACTION_START = "com.crave.customer.orders.START";
    public static final String ACTION_STOP  = "com.crave.customer.orders.STOP";
    public static final String EXTRA_TOKEN       = "token";
    public static final String EXTRA_USER_ID     = "userId";
    public static final String EXTRA_API_BASE_URL = "apiBaseUrl";

    private static final String CHANNEL_ONGOING = "customer-order-status";
    private static final String CHANNEL_ALERTS  = "customer-order-alerts";
    private static final int    NOTIFICATION_ID  = 3301;
    private static final long   POLL_INTERVAL_MS = 20_000L;
    private static final int    MAX_IDLE_POLLS   = 9; // stop after 3 min with no active order

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private volatile boolean polling;
    private volatile int idlePollCount;

    // Tracks the last seen status for each order so we only fire one
    // notification per transition, not one per poll.
    private final java.util.Map<String, String> lastSeenStatus = new java.util.HashMap<>();

    private final Runnable pollTask = new Runnable() {
        @Override public void run() {
            poll();
            handler.postDelayed(this, POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("order_polling_service", Context.MODE_PRIVATE);
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
        startForeground(NOTIFICATION_ID, buildOngoingNotification("Tracking your order…"));
        handler.removeCallbacks(pollTask);
        handler.post(pollTask);
        return START_STICKY;
    }

    private void persistConfig(Intent intent) {
        SharedPreferences.Editor ed = prefs.edit();
        String token = intent.getStringExtra(EXTRA_TOKEN);
        String userId = intent.getStringExtra(EXTRA_USER_ID);
        String base   = intent.getStringExtra(EXTRA_API_BASE_URL);
        if (token  != null && !token.isBlank())  ed.putString("token", token);
        if (userId != null && !userId.isBlank())  ed.putString("userId", userId);
        if (base   != null && !base.isBlank())    ed.putString("apiBaseUrl", base);
        ed.apply();
    }

    private void poll() {
        if (polling) return;
        String token      = prefs.getString("token", "");
        String apiBaseUrl = prefs.getString("apiBaseUrl", "");
        if (token.isBlank() || !apiBaseUrl.startsWith("https://")) return;

        polling = true;
        executor.execute(() -> {
            try {
                String endpoint = apiBaseUrl.replaceAll("/+$", "") + "/api/orders?active=true";
                HttpURLConnection conn = openGet(endpoint, token);
                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_UNAUTHORIZED || code == HttpURLConnection.HTTP_FORBIDDEN) {
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
                // Support both {orders:[]} and {data:[]}
                JSONArray orders = root.optJSONArray("orders");
                if (orders == null) orders = root.optJSONArray("data");

                boolean hasActive = false;
                if (orders != null) {
                    for (int i = 0; i < orders.length(); i++) {
                        JSONObject o = orders.optJSONObject(i);
                        if (o == null) continue;
                        String status = o.optString("status", "");
                        // Active order statuses — anything not terminal
                        boolean active = !status.equals("delivered")
                                && !status.equals("completed")
                                && !status.equals("cancelled");
                        if (!active) continue;
                        hasActive = true;
                        idlePollCount = 0;

                        String orderId = o.optString("id", "");
                        String prev = lastSeenStatus.get(orderId);
                        if (prev != null && !prev.equals(status)) {
                            notifyStatusChange(orderId, status, o);
                        }
                        lastSeenStatus.put(orderId, status);
                    }
                }

                if (!hasActive) {
                    idlePollCount++;
                    if (idlePollCount >= MAX_IDLE_POLLS) shutdown();
                }
            } catch (Exception ignored) {
                // Retry on next tick.
            } finally {
                polling = false;
            }
        });
    }

    private void notifyStatusChange(String orderId, String status, JSONObject order) {
        String title;
        String body;
        switch (status) {
            case "confirmed":
                title = "Order confirmed ✓";
                body  = "Your order has been accepted and will be prepared shortly.";
                break;
            case "preparing":
            case "packing":
                title = "Kitchen is cooking 🍳";
                body  = "Your order is being prepared.";
                break;
            case "ready_for_pickup":
                title = "Ready for pickup 📦";
                body  = "Your order is ready — a driver will pick it up soon.";
                break;
            case "out_for_delivery":
            case "on_the_way":
                title = "On the way! 🛵";
                body  = "Your rider has picked up your order and is heading your way.";
                break;
            case "delivered":
            case "completed":
                title = "Delivered! 🎉";
                body  = "Enjoy your meal! Rate your experience in the app.";
                break;
            default:
                return; // Don't notify for statuses without a user-friendly message.
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                   != PackageManager.PERMISSION_GRANTED) return;

        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("orderId", orderId);
        PendingIntent pi = PendingIntent.getActivity(this, orderId.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new NotificationCompat.Builder(this, CHANNEL_ALERTS)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .build();
        NotificationManagerCompat.from(this).notify(Math.max(1, orderId.hashCode() & 0x7fffffff), n);
    }

    // ── Notification helpers ─────────────────────────────────────────────────

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);

        NotificationChannel ongoing = new NotificationChannel(
                CHANNEL_ONGOING, "Order tracking", NotificationManager.IMPORTANCE_LOW);
        ongoing.setDescription("Runs in the background while your order is active");
        ongoing.setShowBadge(false);
        nm.createNotificationChannel(ongoing);

        NotificationChannel alerts = new NotificationChannel(
                CHANNEL_ALERTS, "Order status alerts", NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("Updates when your order status changes");
        alerts.enableVibration(true);
        nm.createNotificationChannel(alerts);
    }

    private Notification buildOngoingNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ONGOING)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle("crave.")
                .setContentText(text)
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
        conn.setRequestProperty("X-Crave-Native-App", "customer");
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
