package com.crave.customer;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor bridge for the customer-app OrderPollingService.
 *
 * Exposed methods:
 *   start(token, userId, apiBaseUrl)  — start / restart the foreground polling service
 *   stop()                            — stop the service
 */
@CapacitorPlugin(name = "OrderPolling")
public class OrderPollingPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String token = call.getString("token", "");
        String userId = call.getString("userId", "");
        String apiBaseUrl = call.getString("apiBaseUrl", "");
        if (token == null || token.isBlank() || userId == null || userId.isBlank()
                || apiBaseUrl == null || !apiBaseUrl.startsWith("https://")) {
            call.reject("A secure backend session is required to start order polling.");
            return;
        }
        Intent intent = new Intent(getContext(), OrderPollingService.class);
        intent.setAction(OrderPollingService.ACTION_START);
        intent.putExtra(OrderPollingService.EXTRA_TOKEN, token);
        intent.putExtra(OrderPollingService.EXTRA_USER_ID, userId);
        intent.putExtra(OrderPollingService.EXTRA_API_BASE_URL, apiBaseUrl);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve(new JSObject().put("active", true));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), OrderPollingService.class);
        intent.setAction(OrderPollingService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
