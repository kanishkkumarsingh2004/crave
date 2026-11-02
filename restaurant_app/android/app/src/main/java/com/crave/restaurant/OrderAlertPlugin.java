package com.crave.restaurant;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor bridge for the restaurant app OrderAlertService.
 *
 * Exposed methods:
 *   start(token, restaurantId, apiBaseUrl)  — start the foreground polling service
 *   stop()                                  — stop the service
 */
@CapacitorPlugin(name = "OrderAlert")
public class OrderAlertPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String token        = call.getString("token", "");
        String restaurantId = call.getString("restaurantId", "");
        String apiBaseUrl   = call.getString("apiBaseUrl", "");
        if (token == null || token.isBlank()
                || restaurantId == null || restaurantId.isBlank()
                || apiBaseUrl == null || !apiBaseUrl.startsWith("https://")) {
            call.reject("A secure backend session is required to start order alerts.");
            return;
        }
        Intent intent = new Intent(getContext(), OrderAlertService.class);
        intent.setAction(OrderAlertService.ACTION_START);
        intent.putExtra(OrderAlertService.EXTRA_TOKEN, token);
        intent.putExtra(OrderAlertService.EXTRA_RESTAURANT_ID, restaurantId);
        intent.putExtra(OrderAlertService.EXTRA_API_BASE_URL, apiBaseUrl);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve(new JSObject().put("active", true));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), OrderAlertService.class);
        intent.setAction(OrderAlertService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
