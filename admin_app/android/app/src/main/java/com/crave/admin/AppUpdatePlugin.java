package com.crave.admin;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final long MAX_APK_BYTES = 100L * 1024L * 1024L;
    private static final String TRUSTED_HOST = "raw.githubusercontent.com";
    private static final String TRUSTED_PATH =
        "/kanishkkumarsingh2004/crave/main/android-builds/crave-admin-debug.apk";

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlValue = call.getString("url", "");
        String expectedSha256 = call.getString("sha256", "").toLowerCase(Locale.ROOT);
        if (!expectedSha256.matches("^[a-f0-9]{64}$") || !isTrustedUrl(urlValue, expectedSha256)) {
            call.reject("The update source is not trusted.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent permissionIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            getActivity().startActivity(permissionIntent);
            call.resolve(new JSObject().put("permissionRequired", true));
            return;
        }
        new Thread(() -> downloadVerifiedApk(call, urlValue, expectedSha256), "crave-app-update").start();
    }

    private void downloadVerifiedApk(PluginCall call, String urlValue, String expectedSha256) {
        File updateDirectory = new File(getContext().getCacheDir(), "updates");
        File apkFile = new File(updateDirectory, "crave-admin-" + expectedSha256.substring(0, 12) + ".apk");
        HttpURLConnection connection = null;
        try {
            if (!updateDirectory.exists() && !updateDirectory.mkdirs()) {
                throw new IllegalStateException("Could not create the secure update directory.");
            }
            connection = (HttpURLConnection) new URL(urlValue).openConnection();
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
            connection.setInstanceFollowRedirects(false);
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IllegalStateException("Update download failed (" + status + ").");
            long declaredLength = connection.getContentLengthLong();
            if (declaredLength <= 0 || declaredLength > MAX_APK_BYTES) throw new IllegalStateException("The update file size is invalid.");

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long received = 0;
            try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream()); FileOutputStream output = new FileOutputStream(apkFile, false)) {
                byte[] buffer = new byte[16 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    received += count;
                    if (received > MAX_APK_BYTES) throw new IllegalStateException("The update file is too large.");
                    digest.update(buffer, 0, count);
                    output.write(buffer, 0, count);
                }
                output.getFD().sync();
            }
            String actualSha256 = toHex(digest.digest());
            if (received != declaredLength || !actualSha256.equals(expectedSha256)) {
                apkFile.delete();
                throw new SecurityException("The downloaded update failed its security check.");
            }
            Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(installIntent);
                    call.resolve(new JSObject().put("installerOpened", true));
                } catch (Exception error) {
                    call.reject("Android could not open the update installer.", error);
                }
            });
        } catch (Exception error) {
            apkFile.delete();
            call.reject(error.getMessage() == null ? "The update could not be installed." : error.getMessage(), error);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private boolean isTrustedUrl(String value, String expectedSha256) {
        try {
            URL url = new URL(value);
            return "https".equalsIgnoreCase(url.getProtocol()) && TRUSTED_HOST.equalsIgnoreCase(url.getHost()) && TRUSTED_PATH.equals(url.getPath()) && ("sha256=" + expectedSha256).equals(url.getQuery());
        } catch (Exception ignored) {
            return false;
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format(Locale.ROOT, "%02x", value));
        return result.toString();
    }
}
