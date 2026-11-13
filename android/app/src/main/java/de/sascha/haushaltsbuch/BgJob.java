package de.sascha.haushaltsbuch;

import android.annotation.SuppressLint;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Notifications while the app is closed: about every 15 minutes the app's own page is started without a window,
 * syncs with the other devices and shows what is new (shopping trip started on the PC, budget used up, …).
 * Everything is worked out by the page itself – exactly like when the app is open.
 * If the app is still alive in the background, its page does the check instead (no second copy).
 */
public class BgJob extends JobService {
    static final int JOB_ID = 4712;
    private static final String APP_URL = "file:///android_asset/index.html";
    private static final long MAX_MS = 100_000;

    static void plan(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(JOB_ID) != null) return;
        JobInfo ji = new JobInfo.Builder(JOB_ID, new ComponentName(c, BgJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        try { js.schedule(ji); } catch (Exception ignored) {}
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView web;
    private JobParameters params;
    private boolean finished;

    @Override
    public boolean onStartJob(JobParameters p) {
        params = p;
        finished = false;
        main.post(this::run);
        main.postDelayed(this::finish, MAX_MS);   // never hang
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters p) {
        main.post(this::cleanup);
        return true;
    }

    private void run() {
        if (MainActivity.fg) { finish(); return; }          // app is open: it syncs and notifies by itself
        MainActivity a = MainActivity.live;
        if (a != null) { a.runBg(() -> main.post(this::finish)); return; }
        try { startPage(); } catch (Throwable t) { finish(); }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void startPage() {
        web = new WebView(getApplicationContext());
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setBlockNetworkImage(true);
        web.addJavascriptInterface(new BgBridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!APP_URL.equals(request.getUrl().toString())) return null;
                byte[] html = MainActivity.newestApp(getApplicationContext());
                if (html == null) return null;
                return new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(html));
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }   // never leave the app page
            @Override
            public void onPageFinished(WebView view, String url) {
                // give the app a moment to start, then ask it to check
                main.postDelayed(() -> { if (web != null) web.evaluateJavascript("window.hbBg ? window.hbBg() : AndroidBridge.bgDone()", null); }, 2500);
            }
        });
        byte[] html = MainActivity.newestApp(getApplicationContext());
        if (html == null) web.loadUrl(APP_URL);
        else web.loadDataWithBaseURL(APP_URL, new String(html, StandardCharsets.UTF_8), "text/html", "utf-8", APP_URL);
    }

    private void cleanup() {
        if (web != null) {
            try { web.stopLoading(); web.removeJavascriptInterface("AndroidBridge"); web.destroy(); } catch (Throwable ignored) {}
            web = null;
        }
    }

    private void finish() {
        if (finished) return;
        finished = true;
        main.removeCallbacksAndMessages(null);
        cleanup();
        try { jobFinished(params, false); } catch (Throwable ignored) {}
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        try (InputStream is = in) {
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            return bo.toByteArray();
        }
    }

    /** What the page may use without a window: storage key, server requests, notifications. Everything else does nothing. */
    private class BgBridge {
        private Context c() { return getApplicationContext(); }

        @JavascriptInterface public boolean bgMode() { return true; }
        @JavascriptInterface public void bgDone() { main.postDelayed(BgJob.this::finish, 500); }

        @JavascriptInterface public String seal(String text) { return Vault.seal(c(), text == null ? "" : text); }
        @JavascriptInterface public String unseal(String sealed) { String r = Vault.unseal(c(), sealed); return r == null ? "\u0000fail" : r; }
        @JavascriptInterface public String pbkdf2(String pin, String salt, int iter) { return Vault.pbkdf2(pin == null ? "" : pin, salt == null ? "" : salt, iter); }

        @JavascriptInterface public void http(String id, String method, String url, String auth, String body) { httpAs(id, method, url, auth, body, ""); }
        @JavascriptInterface
        public void httpAs(final String id, final String method, final String url, final String auth, final String body, final String certHost) {
            new Thread(() -> {
                Object[] r = MainActivity.httpCall(method, url, auth, body, certHost);
                final String js = "window.hbHttpDone&&window.hbHttpDone(" + JSONObject.quote(id) + "," + r[0] + "," + JSONObject.quote((String) r[1]) + ")";
                main.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
            }).start();
        }

        @JavascriptInterface
        public String notifyState() {
            if (android.os.Build.VERSION.SDK_INT < 33) {
                android.app.NotificationManager nm = c().getSystemService(android.app.NotificationManager.class);
                return nm != null && nm.areNotificationsEnabled() ? "granted" : "denied";
            }
            return c().checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED ? "granted" : "denied";
        }
        @JavascriptInterface public void notifyNow(int id, String title, String text, String ch) { Notifier.show(c(), id, title, text, ch); }
        @JavascriptInterface public void notifySchedule(String json) { Notifier.schedule(c(), json); }

        @JavascriptInterface
        public String nativeRev() {
            try (InputStream is = c().getAssets().open("native.txt")) { return new String(readAll(is), StandardCharsets.UTF_8).trim(); }
            catch (Exception e) { return "0"; }
        }
        @JavascriptInterface public String appVersions() { return "{}"; }
        @JavascriptInterface public boolean takeUpdTap() { return false; }
        @JavascriptInterface
        public boolean deviceSecure() {
            try { android.app.KeyguardManager km = c().getSystemService(android.app.KeyguardManager.class); return km != null && km.isDeviceSecure(); }
            catch (Exception e) { return false; }
        }

        // nothing to show or open without a window
        @JavascriptInterface public void notifyAsk() {}
        @JavascriptInterface public void notifySettings() {}
        @JavascriptInterface public void openInApp(String url) {}
        @JavascriptInterface public boolean saveApp(String html) { return false; }
        @JavascriptInterface public void copySecret(String text, int sec) {}
        @JavascriptInterface public void setSecure(boolean on) {}
        @JavascriptInterface public void ghFetch(String id, String url, String token, String kind) {}
        @JavascriptInterface public void biometric(String id) {}
        @JavascriptInterface public void ocrImage(String id, String dataUrl) {}
        @JavascriptInterface public void scanReceipt(String id, String source) {}
        @JavascriptInterface public void fetchImage(String id, String url) {}
        @JavascriptInterface public void reloadApp() {}
        @JavascriptInterface public boolean saveFile(String name, String content) { return false; }
        @JavascriptInterface public boolean saveFileB64(String name, String mime, String b64) { return false; }
        @JavascriptInterface public boolean shareImage(String b64, String name) { return false; }
        @JavascriptInterface public boolean sendMail(String to, String subject, String body, String imagesJson) { return false; }
        @JavascriptInterface public boolean autoBackup(String name, String content, int keep) { return false; }
    }
}
