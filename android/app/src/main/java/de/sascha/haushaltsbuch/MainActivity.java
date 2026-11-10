package de.sascha.haushaltsbuch;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.media.ExifInterface;
import android.util.Base64;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.CancellationSignal;
import androidx.core.content.FileProvider;
import androidx.browser.customtabs.CustomTabsIntent;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.nio.charset.StandardCharsets;

/**
 * Shows the Haushaltsbuch web app. Data is kept in the WebView's local storage.
 * The app code comes from the APK's assets, or from a newer version the app downloaded from the Synology
 * (saved in the app's private folder and served under the same address, so the stored data stays the same).
 */
public class MainActivity extends Activity {
    private static final int FILE_REQUEST = 1;
    private static final int SCAN_CAMERA = 2;
    private static final int SCAN_GALLERY = 3;
    private String scanId;
    private Uri scanUri;
    private static final String APP_URL = "file:///android_asset/index.html";
    private static final Pattern VERSION = Pattern.compile("name=\"hb-version\" content=\"(\\d+)\"");
    /** Public key of the GitHub build. Updates from the Synology are only used if the build signed them. */
    private static final String UPDATE_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWc6eJAgFbzrfP4Smmawd8Iv5ApsSFtZXDcZ4odJm/NDemZmJ1c6KQt4h+Jn6e+5KhGaXm6EIuf0jWIHZUtHptQ==";
    private static final byte[] SIG_MARK = "\n<!--hb-sig:".getBytes(StandardCharsets.UTF_8);

    /** true if the HTML ends with a valid signature of the GitHub build (ECDSA P-256 over everything before it). */
    static boolean signedByBuild(byte[] html) {
        try {
            int at = -1;
            for (int i = html.length - SIG_MARK.length; i >= Math.max(0, html.length - 400); i--) {
                boolean ok = true;
                for (int k = 0; k < SIG_MARK.length && ok; k++) ok = html[i + k] == SIG_MARK[k];
                if (ok) { at = i; break; }
            }
            if (at < 0) return false;
            String tail = new String(html, at + SIG_MARK.length, html.length - at - SIG_MARK.length, StandardCharsets.US_ASCII);
            int end = tail.indexOf("-->");
            if (end < 1) return false;
            byte[] sig = Base64.decode(tail.substring(0, end).trim(), Base64.DEFAULT);
            java.security.PublicKey key = java.security.KeyFactory.getInstance("EC")
                    .generatePublic(new java.security.spec.X509EncodedKeySpec(Base64.decode(UPDATE_KEY, Base64.DEFAULT)));
            java.security.Signature v = java.security.Signature.getInstance("SHA256withECDSA");
            v.initVerify(key);
            v.update(html, 0, at);
            return v.verify(sig);
        } catch (Exception e) {
            return false;
        }
    }
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // no screenshots, screen recordings or preview picture in the app overview (can be switched off in Sicherheit)
        if (getSharedPreferences("hb-native", MODE_PRIVATE).getBoolean("secure", true))
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);   // live camera preview for the document scanner
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        // the app (a local file) talks to the user's own Synology for syncing
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);   // Synology requests go through the native bridge, not the page
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!APP_URL.equals(request.getUrl().toString())) return null;
                byte[] html = newestApp();
                if (html == null) return null;
                return new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(html));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("file".equals(u.getScheme()) && APP_URL.equals(u.toString())) return false;   // only the app itself
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        // <input type="file"> for the CSV import and backup restore
        web.setWebChromeClient(new WebChromeClient() {
            /** live camera for the document scanner (getUserMedia): only the camera, only after the user allowed it */
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean cam = false;
                    for (String r : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) cam = true;
                    if (!cam) { request.deny(); return; }
                    if (checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED)
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    else { pendingCam = request; requestPermissions(new String[]{android.Manifest.permission.CAMERA}, CAM_REQUEST); }
                });
            }
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                // pictures (accept="image/*") open the gallery, everything else the file picker
                String[] acc = params.getAcceptTypes();
                boolean img = acc != null && acc.length > 0 && acc[0] != null && acc[0].startsWith("image/");
                i.setType(img ? "image/*" : "*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, img ? "Foto auswählen" : "Datei auswählen"), FILE_REQUEST);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        loadApp();
    }

    /** opens Android's installer for the downloaded update (Android itself checks that it is signed like this app) */
    String installApk(File f) {
        if (android.os.Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Intent p = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
            p.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            runOnUiThread(() -> { try { startActivity(p); } catch (Exception ignored) {} });
            return "permission";
        }
        Uri u = FileProvider.getUriForFile(this, "de.sascha.haushaltsbuch.files", f);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(u, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        runOnUiThread(() -> startActivity(i));
        return "installing";
    }

    /** Shows the newest version: a downloaded (signed) update directly, otherwise the copy inside the APK.
     *  Loaded as data with the app's own address, so storage and everything else stay the same. */
    void loadApp() {
        byte[] html = newestApp();
        if (html == null) { web.loadUrl(APP_URL); return; }
        web.loadDataWithBaseURL(APP_URL, new String(html, StandardCharsets.UTF_8), "text/html", "utf-8", APP_URL);
    }

    private File cachedAppFile() { return new File(getFilesDir(), "app.html"); }

    private static int versionOf(byte[] html) {
        if (html == null) return 0;
        Matcher m = VERSION.matcher(new String(html, 0, Math.min(html.length, 4000), StandardCharsets.UTF_8));
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        try (InputStream is = in) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            return bo.toByteArray();
        }
    }

    /** The downloaded version if it is newer than the one inside the APK, otherwise null (= use the APK's copy). */
    private byte[] newestApp() {
        try {
            File f = cachedAppFile();
            if (!f.exists()) return null;
            byte[] cached = readAll(new java.io.FileInputStream(f));
            if (!signedByBuild(cached)) { f.delete(); return null; }   // changed or unsigned: never run it
            byte[] bundled = readAll(getAssets().open("index.html"));
            return versionOf(cached) > versionOf(bundled) ? cached : null;
        } catch (Exception e) {
            return null;
        }
    }

    private int currentVersion() {
        try {
            byte[] n = newestApp();
            return n != null ? versionOf(n) : versionOf(readAll(getAssets().open("index.html")));
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == SCAN_CAMERA || requestCode == SCAN_GALLERY) {
            if (resultCode != RESULT_OK) { scanDone(null, "cancel"); return; }
            Uri uri = requestCode == SCAN_CAMERA ? scanUri : (data != null ? data.getData() : null);
            if (uri == null) { scanDone(null, "Kein Bild erhalten"); return; }
            recognize(uri);
            return;
        }
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.hbBack && window.hbBack()) ? 'yes' : 'no'", value -> {
            if (value == null || !value.contains("yes")) finish();
        });
    }

    /* ---------- receipt scan: photo -> text recognition on the phone -> lines with positions to the app ---------- */
    private void startScan(String source) {
        try {
            if ("gallery".equals(source)) {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.setType("image/*");
                i.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(i, "Foto auswählen"), SCAN_GALLERY);
            } else {
                // with CAMERA in the manifest, the system camera only opens once the permission is granted
                if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{android.Manifest.permission.CAMERA}, SCAN_CAM_REQUEST);
                    return;
                }
                File dir = new File(getCacheDir(), "scan");
                dir.mkdirs();
                File f = new File(dir, "quittung.jpg");
                scanUri = FileProvider.getUriForFile(this, "de.sascha.haushaltsbuch.files", f);
                Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                i.putExtra(MediaStore.EXTRA_OUTPUT, scanUri);
                i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(i, SCAN_CAMERA);
            }
        } catch (Exception e) {
            scanDone(null, "Kamera konnte nicht geöffnet werden");
        }
    }

    private void recognize(Uri uri) {
        try {
            InputImage img = InputImage.fromFilePath(this, uri);
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(img)
                .addOnSuccessListener(text -> new Thread(() -> {
                    try {
                        JSONArray arr = new JSONArray();
                        for (Text.TextBlock b : text.getTextBlocks()) {
                            for (Text.Line l : b.getLines()) {
                                JSONObject o = new JSONObject();
                                o.put("t", l.getText());
                                Rect r = l.getBoundingBox();
                                if (r != null) { o.put("x", r.left); o.put("y", r.top); o.put("w", r.width()); o.put("h", r.height()); }
                                arr.put(o);
                            }
                        }
                        JSONObject res = new JSONObject();
                        res.put("lines", arr);
                        String photo = jpegDataUrl(uri);
                        if (photo != null) res.put("img", photo);
                        scanDone(res.toString(), null);
                    } catch (Exception e) {
                        scanDone(null, "Text konnte nicht erkannt werden");
                    }
                }).start())
                .addOnFailureListener(e -> scanDone(null, "Text konnte nicht erkannt werden"));
        } catch (Exception e) {
            scanDone(null, "Bild konnte nicht gelesen werden");
        }
    }

    /** The receipt photo, at most 1600 px, upright, as JPEG data URL (kept with the booking). */
    private String jpegDataUrl(Uri uri) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            try (InputStream is = getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(is, null, o); }
            int max = Math.max(o.outWidth, o.outHeight), sample = 1;
            while (max / (sample * 2) >= 1600) sample *= 2;
            BitmapFactory.Options o2 = new BitmapFactory.Options();
            o2.inSampleSize = sample;
            Bitmap bm;
            try (InputStream is = getContentResolver().openInputStream(uri)) { bm = BitmapFactory.decodeStream(is, null, o2); }
            if (bm == null) return null;
            int rot = 0;
            try (InputStream is = getContentResolver().openInputStream(uri)) {
                int or = new ExifInterface(is).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                rot = or == ExifInterface.ORIENTATION_ROTATE_90 ? 90 : or == ExifInterface.ORIENTATION_ROTATE_180 ? 180 : or == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
            } catch (Exception ignored) {}
            float k = Math.min(1f, 1600f / Math.max(bm.getWidth(), bm.getHeight()));
            Matrix mx = new Matrix();
            mx.postScale(k, k);
            mx.postRotate(rot);
            Bitmap out = Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), mx, true);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            out.compress(Bitmap.CompressFormat.JPEG, 72, bo);
            return "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    private void bioDone(String id, boolean ok) {
        final String js = "window.hbBioDone && window.hbBioDone(" + JSONObject.quote(id) + "," + ok + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void ocrDone(String id, String json, String err) {
        final String js = "window.hbOcrDone && window.hbOcrDone(" + JSONObject.quote(id) + "," + (json == null ? "null" : JSONObject.quote(json)) + "," + (err == null ? "null" : JSONObject.quote(err)) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private void scanDone(String json, String err) {
        final String js = "window.hbScanDone && window.hbScanDone(" + JSONObject.quote(scanId == null ? "" : scanId) + ","
            + (json == null ? "null" : JSONObject.quote(json)) + "," + (err == null ? "null" : JSONObject.quote(err)) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.evaluateJavascript("window.hbPaused && window.hbPaused()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.hbResumed && window.hbResumed()", null);
    }

    private static final int NOTIFY_REQUEST = 7;
    private static final int CAM_REQUEST = 8;
    private static final int SCAN_CAM_REQUEST = 9;
    private PermissionRequest pendingCam;

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == SCAN_CAM_REQUEST) {
            if (res.length > 0 && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) startScan("camera");
            else scanDone(null, "Kamera nicht erlaubt");
            return;
        }
        if (code == CAM_REQUEST && pendingCam != null) {
            if (res.length > 0 && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) pendingCam.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingCam.deny();
            pendingCam = null;
            return;
        }
        if (code == NOTIFY_REQUEST && web != null)
            web.evaluateJavascript("window.hbNotifyPerm && window.hbNotifyPerm(" + (res.length > 0 && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) + ")", null);
    }

    /** Called from JavaScript as window.AndroidBridge */
    private class Bridge {
        /** "granted" or "denied" – whether the app may show notifications */
        @JavascriptInterface
        public String notifyState() {
            if (android.os.Build.VERSION.SDK_INT < 33) {
                android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
                return nm != null && nm.areNotificationsEnabled() ? "granted" : "denied";
            }
            return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED ? "granted" : "denied";
        }

        /** Asks the user for permission (Android 13+); the answer comes back through window.hbNotifyPerm(ok). */
        @JavascriptInterface
        public void notifyAsk() {
            runOnUiThread(() -> {
                if (android.os.Build.VERSION.SDK_INT >= 33 && !"granted".equals(notifyState()))
                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFY_REQUEST);
                else if (web != null) web.evaluateJavascript("window.hbNotifyPerm && window.hbNotifyPerm(" + "granted".equals(notifyState()) + ")", null);
            });
        }

        /** Opens the Android settings for this app's notifications. */
        @JavascriptInterface
        public void notifySettings() {
            Intent i = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
            runOnUiThread(() -> { try { startActivity(i); } catch (Exception ignored) {} });
        }

        @JavascriptInterface
        public void notifyNow(int id, String title, String text, String ch) {
            Notifier.show(MainActivity.this, id, title, text, ch);
        }

        /** Replaces all planned notifications: JSON array of {id, at (ms), title, text, ch}. */
        @JavascriptInterface
        public void notifySchedule(String json) {
            Notifier.schedule(MainActivity.this, json);
        }

        /** Stores a newer app version (downloaded from the Synology); it is used from the next (re)load on. */
        /** Opens a web page (e.g. a shop's weekly offers) inside the app as a "custom tab"; back returns to the app. */
        @JavascriptInterface
        public void openInApp(final String url) {
            runOnUiThread(() -> {
                Uri u = Uri.parse(url);
                if (!"https".equals(u.getScheme())) return;
                try {
                    new CustomTabsIntent.Builder().setShowTitle(true).setUrlBarHidingEnabled(true).build().launchUrl(MainActivity.this, u);
                } catch (Exception e) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                }
            });
        }

        @JavascriptInterface
        public boolean saveApp(String html) {
            try {
                byte[] b = html.getBytes(StandardCharsets.UTF_8);
                if (!html.contains("id=\"loginBg\"") || versionOf(b) <= currentVersion() || !signedByBuild(b)) return false;
                File tmp = new File(getFilesDir(), "app.html.tmp");
                try (FileOutputStream os = new FileOutputStream(tmp)) { os.write(b); }
                return tmp.renameTo(cachedAppFile());
            } catch (Exception e) {
                return false;
            }
        }

        /**
         * Network requests to the Synology go through Android directly (not the WebView), so the browser rules
         * for local network access never get in the way. The answer comes back via window.hbHttpDone(id, status, text).
         */
        /** screen protection on/off (FLAG_SECURE), remembered for the next start */
        @JavascriptInterface
        public void setSecure(final boolean on) {
            getSharedPreferences("hb-native", MODE_PRIVATE).edit().putBoolean("secure", on).apply();
            runOnUiThread(() -> { if (on) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
                                  else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE); });
        }

        /** encrypted storage for the app data (see Vault) */
        @JavascriptInterface
        public String seal(String text) { return Vault.seal(MainActivity.this, text == null ? "" : text); }
        @JavascriptInterface
        public String unseal(String sealed) { String r = Vault.unseal(MainActivity.this, sealed); return r == null ? "\u0000fail" : r; }
        @JavascriptInterface
        public String pbkdf2(String pin, String salt, int iter) { return Vault.pbkdf2(pin == null ? "" : pin, salt == null ? "" : salt, iter); }

        @JavascriptInterface
        public void http(final String id, final String method, final String url, final String auth, final String body) {
            httpAs(id, method, url, auth, body, "");
        }

        /** like http(), but for the Synology in the home network: https to its local address (192.168.…),
            the certificate has to be valid for certHost (its internet name) – so nobody in the WLAN can read along */
        @JavascriptInterface
        public void httpAs(final String id, final String method, final String url, final String auth, final String body, final String certHost) {
            new Thread(() -> {
                int code = 0;
                String text = "";
                HttpURLConnection c = null;
                try {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException();
                    URL u0 = new URL(url);
                    c = (HttpURLConnection) u0.openConnection();
                    final boolean pin = certHost != null && !certHost.isEmpty();
                    if (pin) {
                        if (!(c instanceof javax.net.ssl.HttpsURLConnection)
                                || !u0.getHost().matches("^(192\\.168\\.|10\\.|172\\.(1[6-9]|2\\d|3[01])\\.)[0-9.]+$")
                                || !certHost.matches("^[a-z0-9.-]+$")) throw new IllegalArgumentException();
                        final String want = certHost;
                        ((javax.net.ssl.HttpsURLConnection) c).setHostnameVerifier((h, ses) -> javax.net.ssl.HttpsURLConnection.getDefaultHostnameVerifier().verify(want, ses));
                        c.setInstanceFollowRedirects(false);
                    }
                    c.setConnectTimeout(pin ? 4000 : 8000);
                    c.setReadTimeout(30000);
                    c.setUseCaches(false);
                    c.setRequestMethod("POST".equals(method) ? "POST" : "GET");
                    c.setRequestProperty("Content-Type", "application/json");
                    if (auth != null && !auth.isEmpty()) c.setRequestProperty("Authorization", auth);
                    if ("POST".equals(method)) {
                        c.setDoOutput(true);
                        try (OutputStream os = c.getOutputStream()) { os.write((body == null ? "" : body).getBytes(StandardCharsets.UTF_8)); }
                    }
                    code = c.getResponseCode();
                    InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
                    text = is == null ? "" : new String(readAll(is), StandardCharsets.UTF_8);
                } catch (Exception e) {
                    code = 0;
                    text = "";
                } finally {
                    if (c != null) c.disconnect();
                }
                final String js = "window.hbHttpDone&&window.hbHttpDone(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(text) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        /* ---- self-update from the GitHub release (private repo: read-only key the user entered) ---- */
        @JavascriptInterface
        public String appVersions() {
            try {
                byte[] c = cachedAppFile().exists() ? readAll(new java.io.FileInputStream(cachedAppFile())) : null;
                return "{\"bundled\":" + versionOf(readAll(getAssets().open("index.html"))) + ",\"cached\":" + versionOf(c) + "}";
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public String nativeRev() {
            try (InputStream is = getAssets().open("native.txt")) { return new String(readAll(is), StandardCharsets.UTF_8).trim(); }
            catch (Exception e) { return "0"; }
        }

        /** kind "json": text back; "app": verify signature and keep as next app version; "apk": install the new Android app */
        @JavascriptInterface
        public void ghFetch(final String id, final String url, final String token, final String kind) {
            new Thread(() -> {
                String result = "", err = "";
                try {
                    if (!url.startsWith("https://api.github.com/repos/minghatsu/")) throw new IllegalArgumentException("Adresse nicht erlaubt");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(10000); c.setReadTimeout(120000);
                    if (token != null && !token.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + token);   // public download repo: no key
                    c.setRequestProperty("User-Agent", "FinanzMAMI");
                    c.setRequestProperty("Accept", "json".equals(kind) ? "application/vnd.github+json" : "application/octet-stream");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) {     // download link of the file: fetched without the key
                        String loc = c.getHeaderField("Location"); c.disconnect();
                        if (loc == null || !loc.startsWith("https://")) throw new IllegalStateException("Weiterleitung fehlt");
                        c = (HttpURLConnection) new URL(loc).openConnection();
                        c.setConnectTimeout(10000); c.setReadTimeout(120000);
                        code = c.getResponseCode();
                    }
                    if (code == 401 || code == 403) throw new IllegalStateException("Update-Schlüssel ungültig oder abgelaufen");
                    if (code != 200) throw new IllegalStateException("GitHub antwortet mit " + code);
                    byte[] b = readAll(c.getInputStream()); c.disconnect();
                    if ("json".equals(kind)) result = new String(b, StandardCharsets.UTF_8);
                    else if ("app".equals(kind)) {
                        if (!signedByBuild(b)) throw new IllegalStateException("Signatur stimmt nicht");
                        result = saveApp(new String(b, StandardCharsets.UTF_8)) ? "saved" : "same";
                    } else if ("apk".equals(kind)) {
                        File dir = new File(getCacheDir(), "update"); dir.mkdirs();
                        File f = new File(dir, "update.apk");
                        try (FileOutputStream os = new FileOutputStream(f)) { os.write(b); }
                        result = installApk(f);
                    }
                } catch (Exception e) {
                    err = e.getMessage() == null ? "Fehler" : e.getMessage();
                }
                final String js = "window.hbGhDone&&window.hbGhDone(" + JSONObject.quote(id) + "," + JSONObject.quote(result) + "," + JSONObject.quote(err) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        /* ---- app lock: fingerprint / face via the system dialog ---- */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public boolean biometricAvailable() {
            try {
                BiometricManager bm = getSystemService(BiometricManager.class);
                if (bm == null) return false;
                // fingerprint or face (also the "weak" kind many phones use)
                if (android.os.Build.VERSION.SDK_INT >= 30)
                    return bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
                return bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void biometric(final String id) {
            runOnUiThread(() -> {
                final java.util.concurrent.Executor ex = getMainExecutor();
                try {
                    BiometricPrompt.Builder pb = new BiometricPrompt.Builder(MainActivity.this)
                        .setTitle("Haushaltsbuch entsperren")
                        .setNegativeButton("PIN eingeben", ex, (d, w) -> bioDone(id, false));
                    if (android.os.Build.VERSION.SDK_INT >= 30) pb.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK);
                    BiometricPrompt p = pb.build();
                    p.authenticate(new CancellationSignal(), ex, new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { bioDone(id, true); }
                        @Override public void onAuthenticationError(int code, CharSequence msg) { bioDone(id, false); }
                    });
                } catch (Exception e) {
                    bioDone(id, false);
                }
            });
        }

        /** true if the phone itself is protected (pattern, PIN, password) – then "PIN vergessen" can use it. */
        @JavascriptInterface
        public boolean deviceSecure() {
            try {
                android.app.KeyguardManager km = getSystemService(android.app.KeyguardManager.class);
                return km != null && km.isDeviceSecure();
            } catch (Exception e) {
                return false;
            }
        }

        /** Unlock with the phone's own screen lock (or fingerprint); the answer comes back via window.hbBioDone(id, ok). */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void deviceCredential(final String id) {
            runOnUiThread(() -> {
                final java.util.concurrent.Executor ex = getMainExecutor();
                try {
                    BiometricPrompt.Builder b = new BiometricPrompt.Builder(MainActivity.this)
                        .setTitle("Haushaltsbuch entsperren")
                        .setSubtitle("Mit der Displaysperre deines Handys");
                    if (android.os.Build.VERSION.SDK_INT >= 30)
                        b.setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_WEAK
                            | android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                    else b.setDeviceCredentialAllowed(true);
                    b.build().authenticate(new CancellationSignal(), ex, new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { bioDone(id, true); }
                        @Override public void onAuthenticationError(int code, CharSequence msg) { bioDone(id, false); }
                    });
                } catch (Exception e) {
                    bioDone(id, false);
                }
            });
        }

        /** Text recognition for a picture the app already has (live scanner frame or the straightened photo).
         *  Answers window.hbOcrDone(id, json, err) with the lines and their positions in that picture. */
        @JavascriptInterface
        public void ocrImage(final String id, final String dataUrl) {
            new Thread(() -> {
                try {
                    String b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
                    byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                    Bitmap bm = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (bm == null) throw new IllegalStateException("Bild konnte nicht gelesen werden");
                    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(InputImage.fromBitmap(bm, 0))
                        .addOnSuccessListener(text -> {
                            try {
                                JSONArray arr = new JSONArray();
                                for (Text.TextBlock b : text.getTextBlocks()) for (Text.Line l : b.getLines()) {
                                    JSONObject o = new JSONObject();
                                    o.put("t", l.getText());
                                    Rect r = l.getBoundingBox();
                                    if (r != null) { o.put("x", r.left); o.put("y", r.top); o.put("w", r.width()); o.put("h", r.height()); }
                                    arr.put(o);
                                }
                                ocrDone(id, arr.toString(), null);
                            } catch (Exception e) { ocrDone(id, null, "Text konnte nicht erkannt werden"); }
                        })
                        .addOnFailureListener(e -> ocrDone(id, null, "Text konnte nicht erkannt werden"));
                } catch (Exception e) { ocrDone(id, null, e.getMessage() == null ? "Fehler" : e.getMessage()); }
            }).start();
        }

        @JavascriptInterface
        public void scanReceipt(String id, String source) {
            runOnUiThread(() -> { scanId = id; startScan(source); });
        }

        /** Downloads a small image (merchant logo) and hands it back as data URL via window.hbImgDone(id, data). */
        @JavascriptInterface
        public void fetchImage(final String id, final String url) {
            new Thread(() -> {
                String data = null;
                HttpURLConnection c = null;
                try {
                    if (!url.startsWith("https://")) throw new IllegalArgumentException();
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(15000);
                    c.setInstanceFollowRedirects(true);
                    if (c.getResponseCode() == 200) {
                        String ct = c.getContentType();
                        byte[] b = readAll(c.getInputStream());
                        String type = ct == null ? "" : ct.split(";")[0].trim().toLowerCase();
                        if (b.length > 0 && b.length < 300000 && type.matches("image/[a-z0-9.+-]+"))
                            data = "data:" + type + ";base64," + Base64.encodeToString(b, Base64.NO_WRAP);
                    }
                } catch (Exception e) {
                    data = null;
                } finally {
                    if (c != null) c.disconnect();
                }
                final String js = "window.hbImgDone && window.hbImgDone(" + JSONObject.quote(id) + "," + (data == null ? "null" : JSONObject.quote(data)) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public void reloadApp() {
            runOnUiThread(MainActivity.this::loadApp);
        }

        @JavascriptInterface
        public boolean saveFile(String name, String content) {
            try {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os == null) return false;
                    os.write(content.getBytes(StandardCharsets.UTF_8));
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        /** Saves a binary file (base64) in the Downloads folder, e.g. the receipts as ZIP. */
        @JavascriptInterface
        public boolean saveFileB64(String name, String mime, String b64) {
            try {
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os == null) return false;
                    os.write(bytes);
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /** Opens the Android share menu for an image (base64 JPEG), e.g. to send a receipt. */
        @JavascriptInterface
        public boolean shareImage(String b64, String name) {
            try {
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                File dir = new File(getCacheDir(), "share");
                if (!dir.exists()) dir.mkdirs();
                File[] old = dir.listFiles(); if (old != null) for (File o : old) o.delete();
                String safe = (name == null || name.isEmpty() ? "beleg" : name).replaceAll("[^A-Za-z0-9._-]", "_");
                if (!safe.endsWith(".jpg")) safe += ".jpg";
                File f = new File(dir, safe);
                try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
                Uri uri = FileProvider.getUriForFile(MainActivity.this, "de.sascha.haushaltsbuch.files", f);
                Intent send = new Intent(Intent.ACTION_SEND).setType("image/jpeg").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> { try { startActivity(Intent.createChooser(send, "Beleg teilen")); } catch (Exception ignored) {} });
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        /** Weekly automatic backup: Downloads/Haushaltsbuch-Backups, only the newest `keep` files stay. */
        @JavascriptInterface
        public boolean autoBackup(String name, String content, int keep) {
            try {
                String rel = Environment.DIRECTORY_DOWNLOADS + "/Haushaltsbuch-Backups/";
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                cv.put(MediaStore.Downloads.RELATIVE_PATH, rel);
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os == null) return false;
                    os.write(content.getBytes(StandardCharsets.UTF_8));
                }
                // remove older backups of this app beyond `keep`
                try (android.database.Cursor c = getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME},
                        MediaStore.Downloads.RELATIVE_PATH + "=? AND " + MediaStore.Downloads.DISPLAY_NAME + " LIKE 'haushaltsbuch-auto-%'",
                        new String[]{rel}, MediaStore.Downloads.DISPLAY_NAME + " DESC")) {
                    int n = 0;
                    while (c != null && c.moveToNext()) {
                        if (++n <= Math.max(1, keep)) continue;
                        Uri old = android.content.ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, c.getLong(0));
                        try { getContentResolver().delete(old, null, null); } catch (Exception ignored) {}
                    }
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}
