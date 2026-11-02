package com.crave.driver;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DriverLocation")
public class DriverLocationPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        launch(call, DriverLocationService.ACTION_START);
    }

    @PluginMethod
    public void update(PluginCall call) {
        launch(call, DriverLocationService.ACTION_UPDATE);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), DriverLocationService.class);
        intent.setAction(DriverLocationService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    private void launch(PluginCall call, String action) {
        String token = call.getString("token", "");
        String driverId = call.getString("driverId", "");
        String apiBaseUrl = call.getString("apiBaseUrl", "");
        if (token.isBlank() || driverId.isBlank() || !apiBaseUrl.startsWith("https://")) {
            call.reject("A secure backend session is required to start live location.");
            return;
        }

        Intent intent = new Intent(getContext(), DriverLocationService.class);
        intent.setAction(action);
        intent.putExtra(DriverLocationService.EXTRA_TOKEN, token);
        intent.putExtra(DriverLocationService.EXTRA_DRIVER_ID, driverId);
        intent.putExtra(DriverLocationService.EXTRA_API_BASE_URL, apiBaseUrl);
        intent.putExtra(DriverLocationService.EXTRA_ORDER_ID, call.getString("activeOrderId", ""));
        intent.putExtra(DriverLocationService.EXTRA_VEHICLE_TYPE, call.getString("vehicleType", "EV_SCOOTER"));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve(new JSObject().put("active", true));
    }
}
