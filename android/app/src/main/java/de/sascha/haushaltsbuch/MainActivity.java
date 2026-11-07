package de.sascha.haushaltsbuch;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
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
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        // the app (a local file) talks to the user's own Synology for syncing
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
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
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        // <input type="file"> for the CSV import and backup restore
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Datei auswählen"), FILE_REQUEST);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.loadUrl(APP_URL);
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
                startActivityForResult(Intent.createChooser(i, "Quittung auswählen"), SCAN_GALLERY);
            } else {
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
                        String img = jpegDataUrl(uri);
                        if (img != null) res.put("img", img);
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

    /** Called from JavaScript as window.AndroidBridge */
    private class Bridge {
        /** Stores a newer app version (downloaded from the Synology); it is used from the next (re)load on. */
        @JavascriptInterface
        public boolean saveApp(String html) {
            try {
                byte[] b = html.getBytes(StandardCharsets.UTF_8);
                if (!html.contains("id=\"loginBg\"") || versionOf(b) <= currentVersion()) return false;
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
        @JavascriptInterface
        public void http(final String id, final String method, final String url, final String auth, final String body) {
            new Thread(() -> {
                int code = 0;
                String text = "";
                HttpURLConnection c = null;
                try {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException();
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(8000);
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

        /* ---- app lock: fingerprint / face via the system dialog ---- */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public boolean biometricAvailable() {
            try {
                BiometricManager bm = getSystemService(BiometricManager.class);
                return bm != null && bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void biometric(final String id) {
            runOnUiThread(() -> {
                final java.util.concurrent.Executor ex = getMainExecutor();
                try {
                    BiometricPrompt p = new BiometricPrompt.Builder(MainActivity.this)
                        .setTitle("Haushaltsbuch entsperren")
                        .setNegativeButton("PIN eingeben", ex, (d, w) -> bioDone(id, false))
                        .build();
                    p.authenticate(new CancellationSignal(), ex, new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { bioDone(id, true); }
                        @Override public void onAuthenticationError(int code, CharSequence msg) { bioDone(id, false); }
                    });
                } catch (Exception e) {
                    bioDone(id, false);
                }
            });
        }

        @JavascriptInterface
        public void scanReceipt(String id, String source) {
            runOnUiThread(() -> { scanId = id; startScan(source); });
        }

        @JavascriptInterface
        public void reloadApp() {
            runOnUiThread(() -> web.loadUrl(APP_URL));
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
    }
}
