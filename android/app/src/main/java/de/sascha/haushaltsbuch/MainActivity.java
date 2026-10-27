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
import org.json.JSONObject;
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
