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
    @PluginMethod
    public void open(PluginCall call) {
        String value = call.getString("url", "");
        Uri uri = Uri.parse(value);
        if (!"upi".equalsIgnoreCase(uri.getScheme()) || !"pay".equalsIgnoreCase(uri.getHost())) {
            call.reject("Invalid UPI payment request.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        String app = call.getString("app", "other");
        if ("gpay".equals(app)) {
            intent.setPackage("com.google.android.apps.nbu.paisa.user");
        } else if ("phonepe".equals(app)) {
            intent.setPackage("com.phonepe.app");
        } else if ("paytm".equals(app)) {
            intent.setPackage("net.one97.paytm");
        } else if (!"other".equals(app)) {
            call.reject("Unsupported UPI app.");
            return;
        }
        try {
            if ("other".equals(app)) {
                getActivity().startActivity(Intent.createChooser(intent, "Pay with UPI"));
            } else {
                getActivity().startActivity(intent);
            }
            call.resolve(new JSObject().put("opened", true));
        } catch (ActivityNotFoundException error) {
            call.reject("That UPI app is not installed. Choose another UPI app to continue.", error);
        }
    }
}
