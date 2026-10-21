package com.crave.customer;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpiLauncher")
public class UpiLauncherPlugin extends Plugin {

    /**
     * Opens the payment through the system chooser, so the customer picks the
     * UPI app they want to use from the apps installed on their phone.
     */
    @PluginMethod
    public void open(PluginCall call) {
        String value = call.getString("url", "");
        Uri uri = Uri.parse(value);
        if (!"upi".equalsIgnoreCase(uri.getScheme()) || !"pay".equalsIgnoreCase(uri.getHost())) {
            call.reject("Invalid UPI payment request.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        try {
            getActivity().startActivity(Intent.createChooser(intent, "Pay with UPI"));
            call.resolve(new JSObject().put("opened", true));
        } catch (ActivityNotFoundException error) {
            call.reject("No UPI app is installed on this device.", error);
        }
    }
}
