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
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private boolean testBuild = false;
    private static final int FILE_REQUEST = 1;
    private static final int SCAN_CAMERA = 2;
    private static final int SCAN_GALLERY = 3;
    private static final int SCAN_DOC = 41;
    private static final int FILE_CAM = 42;
    private boolean docForFile = false;
    private int docPages = 1;
    private String scanId;
    private Uri scanUri;
    private static final String APP_URL = "file:///android_asset/index.html";
    private static final Pattern VERSION = Pattern.compile("name=\"hb-version\" content=\"(\\d+)\"");
    private static final String UPDATE_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWc6eJAgFbzrfP4Smmawd8Iv5ApsSFtZXDcZ4odJm/NDemZmJ1c6KQt4h+Jn6e+5KhGaXm6EIuf0jWIHZUtHptQ==";
    private static final byte[] SIG_MARK = "\n<!--hb-sig:".getBytes(StandardCharsets.UTF_8);

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
        // Absturz merken, damit die App ihn beim nächsten Start melden kann
        final Thread.UncaughtExceptionHandler prevCrash = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((th, ex) -> {
            try {
                java.io.StringWriter sw = new java.io.StringWriter(); ex.printStackTrace(new java.io.PrintWriter(sw));
                String txt = "Thread: " + th.getName() + "\nAndroid " + android.os.Build.VERSION.RELEASE + " · " + android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL + "\n\n" + sw;
                if (txt.length() > 6000) txt = txt.substring(0, 6000);
                try (FileOutputStream o = new FileOutputStream(new File(getFilesDir(), "lastcrash.txt"))) { o.write(txt.getBytes(StandardCharsets.UTF_8)); }
            } catch (Throwable ignore) {}
            if (prevCrash != null) prevCrash.uncaughtException(th, ex);
        });
        // Test-Version (nur Debug-Build "MAMI Test"): Fernsteuerung für automatische Tests, keine Bildschirmsperre für Screenshots
        testBuild = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (testBuild) WebView.setWebContentsDebuggingEnabled(true);
        if (!testBuild && getSharedPreferences("hb-native", MODE_PRIVATE).getBoolean("secure", true))
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
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
                if ("file".equals(u.getScheme()) && APP_URL.equals(u.toString())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
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
                String[] acc0 = params.getAcceptTypes();
                boolean img0 = acc0 != null && acc0.length > 0 && acc0[0] != null && acc0[0].startsWith("image/");
                boolean multi = params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
                if (params.isCaptureEnabled() && img0) { docForFile = true; docPages = multi ? 10 : 1; startDocScan(true); return true; }
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                String[] acc = params.getAcceptTypes();
                boolean img = acc != null && acc.length > 0 && acc[0] != null && acc[0].startsWith("image/");
                i.setType(img ? "image/*" : "*/*");
                if (acc != null && acc.length > 1) {
                    java.util.ArrayList<String> mt = new java.util.ArrayList<>();
                    for (String a : acc) if (a != null && a.contains("/")) mt.add(a);
                    if (mt.size() > 1) { i.setType("*/*"); i.putExtra(Intent.EXTRA_MIME_TYPES, mt.toArray(new String[0])); }
                }
                if (multi) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(Intent.createChooser(i, img ? "Foto auswählen" : "Datei auswählen"), FILE_REQUEST);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        updTap = isUpdIntent(getIntent());
        takeShare(getIntent());
        UpdateJob.plan(this);
        BgJob.plan(this);
        live = this;
        loadApp();
    }

    String installApk(File f) {
        if (android.os.Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Intent p = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
            p.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            runOnUiThread(() -> { try { startActivity(p); } catch (Exception ignored) {} });
            return "permission";
        }
        Uri u = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(u, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        runOnUiThread(() -> startActivity(i));
        return "installing";
    }

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

    private byte[] newestApp() { return newestApp(this); }

    static byte[] newestApp(android.content.Context ctx) {
        try {
            File f = new File(ctx.getFilesDir(), "app.html");
            if (!f.exists()) return null;
            byte[] cached = readAll(new java.io.FileInputStream(f));
            if (!signedByBuild(cached)) { f.delete(); return null; }
            byte[] bundled = readAll(ctx.getAssets().open("index.html"));
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
        if (requestCode == SCAN_DOC) {
            boolean forFile = docForFile; docForFile = false;
            Uri page = null; java.util.ArrayList<Uri> pages = new java.util.ArrayList<>();
            if (resultCode == RESULT_OK) {
                try {
                    GmsDocumentScanningResult r = GmsDocumentScanningResult.fromActivityResultIntent(data);
                    if (r != null && r.getPages() != null && !r.getPages().isEmpty()) {
                        clearScanDir();
                        for (GmsDocumentScanningResult.Page pg : r.getPages()) { Uri u = copyToScan(pg.getImageUri(), false); if (u != null) pages.add(u); }
                        if (!pages.isEmpty()) page = pages.get(0);
                    }
                } catch (Exception ignored) {}
            }
            docPages = 1;
            if (forFile) { if (fileCallback != null) { fileCallback.onReceiveValue(pages.isEmpty() ? null : pages.toArray(new Uri[0])); fileCallback = null; } return; }
            if (resultCode != RESULT_OK) { scanDone(null, "cancel"); return; }
            if (page == null) { scanDone(null, "Kein Bild erhalten"); return; }
            recognize(page);
            return;
        }
        if (requestCode == SCAN_CAMERA || requestCode == SCAN_GALLERY) {
            if (resultCode != RESULT_OK) { scanDone(null, "cancel"); return; }
            Uri uri = requestCode == SCAN_CAMERA ? scanUri : (data != null ? data.getData() : null);
            if (uri == null) { scanDone(null, "Kein Bild erhalten"); return; }
            recognize(uri);
            return;
        }
        if (requestCode == FILE_CAM) {
            if (fileCallback != null) { fileCallback.onReceiveValue(resultCode == RESULT_OK && scanUri != null ? new Uri[]{scanUri} : null); fileCallback = null; }
            return;
        }
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                    android.content.ClipData cd = data.getClipData(); int n = Math.min(cd.getItemCount(), 20);
                    result = new Uri[n]; for (int k = 0; k < n; k++) result[k] = cd.getItemAt(k).getUri();
                } else if (data.getData() != null) result = new Uri[]{data.getData()};
            }
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

    /* Dokumentenscanner (Kanten erkennen, Ecken zuschneiden, gerade ziehen) */
    private void startDocScan(boolean forFile) {
        try {
            GmsDocumentScannerOptions o = new GmsDocumentScannerOptions.Builder()
                .setGalleryImportAllowed(true)
                .setPageLimit(forFile ? Math.max(1, docPages) : 1)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
                .build();
            GmsDocumentScanner sc = GmsDocumentScanning.getClient(o);
            sc.getStartScanIntent(this)
                .addOnSuccessListener(is -> {
                    try { startIntentSenderForResult(is, SCAN_DOC, null, 0, 0, 0); }
                    catch (Exception e) { docFallback(forFile); }
                })
                .addOnFailureListener(e -> docFallback(forFile));
        } catch (Throwable e) { docFallback(forFile); }
    }

    private void docFallback(boolean forFile) {
        docForFile = false;
        if (!forFile) { startPlainCam(); return; }
        try {
            if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
                requestPermissions(new String[]{android.Manifest.permission.CAMERA}, CAM_REQUEST);
                return;
            }
            File dir = new File(getCacheDir(), "scan"); dir.mkdirs();
            scanUri = FileProvider.getUriForFile(this, getPackageName() + ".files", new File(dir, "foto.jpg"));
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, scanUri);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, FILE_CAM);
        } catch (Exception e) { if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; } }
    }

    private void clearScanDir() {
        File dir = new File(getCacheDir(), "scan"); dir.mkdirs();
        File[] old = dir.listFiles((d, n) -> n.startsWith("dokument_"));
        if (old != null) for (File x : old) x.delete();
    }
    private Uri copyToScan(Uri src) { clearScanDir(); return copyToScan(src, false); }
    private Uri copyToScan(Uri src, boolean clear) {
        try {
            if (clear) clearScanDir();
            File dir = new File(getCacheDir(), "scan"); dir.mkdirs();
            File f = new File(dir, "dokument_" + System.currentTimeMillis() + "_" + (int)(Math.random()*100000) + ".jpg");
            try (InputStream is = getContentResolver().openInputStream(src); OutputStream os = new FileOutputStream(f)) {
                byte[] b = new byte[65536]; int n; while ((n = is.read(b)) > 0) os.write(b, 0, n);
            }
            return FileProvider.getUriForFile(this, getPackageName() + ".files", f);
        } catch (Exception e) { return src; }
    }

    /* Beleg scannen */
    private void startScan(String source) {
        if (!"gallery".equals(source) && !"photo".equals(source)) { startDocScan(false); return; }
        if ("photo".equals(source)) { startPlainCam(); return; }
        startScanOld(source);
    }

    private void startPlainCam() { startScanOld("camera"); }

    private void startScanOld(String source) {
        try {
            if ("gallery".equals(source)) {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.setType("image/*");
                i.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(i, "Foto auswählen"), SCAN_GALLERY);
            } else {
                if (checkSelfPermission(android.Manifest.permission.CAMERA) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{android.Manifest.permission.CAMERA}, SCAN_CAM_REQUEST);
                    return;
                }
                File dir = new File(getCacheDir(), "scan");
                dir.mkdirs();
                File f = new File(dir, "quittung.jpg");
                scanUri = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
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

    private String jpegDataUrl(Uri uri) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            try (InputStream is = getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(is, null, o); }
            int max = Math.max(o.outWidth, o.outHeight), sample = 1;
            while (max / (sample * 2) >= 2600) sample *= 2;
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
            float k = Math.min(1f, Math.min(2600f / Math.max(bm.getWidth(), bm.getHeight()), 1300f / Math.min(bm.getWidth(), bm.getHeight())));
            Matrix mx = new Matrix();
            mx.postScale(k, k);
            mx.postRotate(rot);
            Bitmap out = Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), mx, true);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            out.compress(Bitmap.CompressFormat.JPEG, 80, bo);
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
        fg = false;
        if (web != null) web.evaluateJavascript("window.hbPaused && window.hbPaused()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        fg = true;
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
            if (res.length > 0 && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) startPlainCam();
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

    static boolean homeHost(String h) {
        if (h == null) return false;
        h = h.toLowerCase(java.util.Locale.ROOT);
        return h.matches("^(10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.|127\\.|100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.)[0-9.]+$")
                || h.equals("localhost") || h.endsWith(".local") || h.endsWith(".fritz.box") || h.endsWith(".ts.net");
    }

    private volatile boolean updTap;

    private static boolean isUpdIntent(Intent i) {
        if (i == null) return false;
        if (i.getBooleanExtra("upd", false)) return true;
        Uri d = i.getData();
        return d != null && "finanzmami".equals(d.getScheme());
    }

    /* Geteilte Dateien (WhatsApp, Mail, Galerie …) */
    private final java.util.ArrayList<String[]> shared = new java.util.ArrayList<>();
    private boolean takeShare(Intent i) {
        if (i == null) return false; String a = i.getAction();
        if (!Intent.ACTION_SEND.equals(a) && !Intent.ACTION_SEND_MULTIPLE.equals(a)) return false;
        java.util.ArrayList<Uri> list = new java.util.ArrayList<>();
        try {
            if (Intent.ACTION_SEND.equals(a)) { Uri u = i.getParcelableExtra(Intent.EXTRA_STREAM); if (u != null) list.add(u); }
            else { java.util.ArrayList<Uri> l = i.getParcelableArrayListExtra(Intent.EXTRA_STREAM); if (l != null) list.addAll(l); }
        } catch (Exception ignored) {}
        if (list.isEmpty()) return false;
        File dir = new File(getCacheDir(), "share"); dir.mkdirs();
        synchronized (shared) {
            File[] old = dir.listFiles(); if (old != null && shared.isEmpty()) for (File x : old) x.delete();
            int k = 0;
            for (Uri u : list) {
                if (k++ >= 20) break;
                try {
                    String type = getContentResolver().getType(u); if (type == null) type = i.getType() != null ? i.getType() : "application/octet-stream";
                    String name = "datei" + k;
                    try (android.database.Cursor c = getContentResolver().query(u, new String[]{android.provider.OpenableColumns.DISPLAY_NAME}, null, null, null)) { if (c != null && c.moveToFirst()) name = c.getString(0); } catch (Exception ignored) {}
                    File f = new File(dir, System.currentTimeMillis() + "_" + k);
                    long tot = 0;
                    try (InputStream is = getContentResolver().openInputStream(u); OutputStream os = new FileOutputStream(f)) {
                        byte[] b = new byte[65536]; int n; while ((n = is.read(b)) > 0) { os.write(b, 0, n); tot += n; if (tot > 25L * 1024 * 1024) break; }
                    }
                    shared.add(new String[]{ f.getAbsolutePath(), name, type });
                } catch (Exception ignored) {}
            }
        }
        if (web != null) web.evaluateJavascript("window.hbShared && window.hbShared()", null);
        return true;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        takeShare(i);
        if (isUpdIntent(i) && web != null) web.evaluateJavascript("window.hbUpdTap && window.hbUpdTap()", null);
    }

    /* Hintergrund-Check */
    static volatile MainActivity live;
    static volatile boolean fg;
    private volatile Runnable bgCb;

    void runBg(Runnable done) {
        bgCb = done;
        if (web == null) { finishBg(); return; }
        web.evaluateJavascript("window.hbBg ? window.hbBg() : (window.AndroidBridge && AndroidBridge.bgDone())", null);
    }
    private void finishBg() { Runnable r = bgCb; bgCb = null; if (r != null) r.run(); }

    @Override
    protected void onDestroy() {
        if (live == this) live = null;
        finishBg();
        super.onDestroy();
    }

    static Object[] httpCall(String method, String url, String auth, String body, String certHost) {
        int code = 0;
        String text = "";
        HttpURLConnection c = null;
        try {
            if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException();
            URL u0 = new URL(url);
            if (url.startsWith("http://") && !homeHost(u0.getHost())) throw new IllegalArgumentException("http only at home");
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
        } catch (Throwable e) {
            code = 0;
            String m = e.getMessage();
            text = "ERR:" + e.getClass().getSimpleName() + (m == null ? "" : ": " + (m.length() > 160 ? m.substring(0, 160) : m));
        } finally {
            if (c != null) c.disconnect();
        }
        return new Object[]{code, text};
    }

    private class Bridge {
        @JavascriptInterface public String lastCrash() {
            try {
                File f = new File(getFilesDir(), "lastcrash.txt"); if (!f.exists()) return "";
                ByteArrayOutputStream bo = new ByteArrayOutputStream();
                try (InputStream in = new java.io.FileInputStream(f)) { byte[] buf = new byte[4096]; int n; while ((n = in.read(buf)) > 0) bo.write(buf, 0, n); }
                f.delete(); return new String(bo.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public void screenshot() {
            // asynchron: Ergebnis kommt über window.hbShotCb zurück (der JS-Faden darf nicht warten)
            web.post(() -> {
                String data = "";
                try {
                    int w = web.getWidth(), h = web.getHeight();
                    if (w > 0 && h > 0) {
                        float k = Math.min(1f, 900f / w);
                        Bitmap bm = Bitmap.createBitmap(Math.round(w * k), Math.round(h * k), Bitmap.Config.RGB_565);
                        android.graphics.Canvas cv = new android.graphics.Canvas(bm); cv.scale(k, k); web.draw(cv);
                        ByteArrayOutputStream o = new ByteArrayOutputStream(); bm.compress(Bitmap.CompressFormat.JPEG, 70, o); bm.recycle();
                        data = "data:image/jpeg;base64," + Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
                    }
                } catch (Throwable ignore) {}
                web.evaluateJavascript("window.hbShotCb&&window.hbShotCb('" + data + "')", null);
            });
        }
        @JavascriptInterface public boolean isTest() { return testBuild; }
        @JavascriptInterface
        public boolean bgMode() { return false; }
        @JavascriptInterface
        public String sharedList() {
            try {
                org.json.JSONArray a = new org.json.JSONArray();
                synchronized (shared) { for (String[] x : shared) { org.json.JSONObject o = new org.json.JSONObject(); o.put("name", x[1]); o.put("type", x[2]); a.put(o); } }
                return a.toString();
            } catch (Exception e) { return "[]"; }
        }
        @JavascriptInterface
        public String sharedData(int k) {
            try {
                String[] x; synchronized (shared) { if (k < 0 || k >= shared.size()) return ""; x = shared.get(k); }
                File f = new File(x[0]); byte[] b = new byte[(int) f.length()];
                try (java.io.FileInputStream is = new java.io.FileInputStream(f)) { int off = 0, n; while (off < b.length && (n = is.read(b, off, b.length - off)) > 0) off += n; }
                return Base64.encodeToString(b, Base64.NO_WRAP);
            } catch (Throwable e) { return ""; }
        }
        @JavascriptInterface
        public void sharedClear() { synchronized (shared) { for (String[] x : shared) new File(x[0]).delete(); shared.clear(); } }
        @JavascriptInterface
        public String batteryState() {
            try {
                android.os.PowerManager pm = getSystemService(android.os.PowerManager.class);
                return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName()) ? "free" : "limited";
            } catch (Exception e) { return "unknown"; }
        }
        @JavascriptInterface
        public void batteryAsk() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()));
                    startActivity(i);
                } catch (Exception e) {
                    try { startActivity(new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); } catch (Exception ignored) {}
                }
            });
        }
        @JavascriptInterface
        public long bgLast() { return getSharedPreferences("hb-bg", MODE_PRIVATE).getLong("last", 0); }
        @JavascriptInterface
        public void bgSoon() { BgJob.soon(MainActivity.this, 60_000); }
        @JavascriptInterface
        public void bgDone() { runOnUiThread(MainActivity.this::finishBg); }

        @JavascriptInterface
        public boolean takeUpdTap() { boolean b = updTap; updTap = false; return b; }


        @JavascriptInterface
        public String notifyState() {
            if (android.os.Build.VERSION.SDK_INT < 33) {
                android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
                return nm != null && nm.areNotificationsEnabled() ? "granted" : "denied";
            }
            return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED ? "granted" : "denied";
        }

        @JavascriptInterface
        public void notifyAsk() {
            runOnUiThread(() -> {
                if (android.os.Build.VERSION.SDK_INT >= 33 && !"granted".equals(notifyState()))
                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFY_REQUEST);
                else if (web != null) web.evaluateJavascript("window.hbNotifyPerm && window.hbNotifyPerm(" + "granted".equals(notifyState()) + ")", null);
            });
        }

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

        @JavascriptInterface
        public void notifySchedule(String json) {
            Notifier.schedule(MainActivity.this, json);
        }

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

        @JavascriptInterface
        public void copySecret(final String text, final int sec) {
            runOnUiThread(() -> {
                try {
                    final android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    if (cm == null) return;
                    android.content.ClipData clip = android.content.ClipData.newPlainText("Code", text);
                    android.os.PersistableBundle ex = new android.os.PersistableBundle();
                    ex.putBoolean("android.content.extra.IS_SENSITIVE", true);
                    clip.getDescription().setExtras(ex);
                    final boolean[] changed = {false};
                    final android.content.ClipboardManager.OnPrimaryClipChangedListener l = () -> changed[0] = true;
                    cm.setPrimaryClip(clip);
                    cm.addPrimaryClipChangedListener(l);
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            cm.removePrimaryClipChangedListener(l);
                            android.content.ClipData now = cm.getPrimaryClip();
                            boolean ours = now != null && now.getItemCount() > 0 && text.contentEquals(now.getItemAt(0).coerceToText(MainActivity.this));
                            if (ours || (now == null && !changed[0])) {
                                if (android.os.Build.VERSION.SDK_INT >= 28) cm.clearPrimaryClip();
                                else cm.setPrimaryClip(android.content.ClipData.newPlainText("", ""));
                            }
                        } catch (Exception ignored) {}
                    }, Math.max(10, Math.min(sec, 600)) * 1000L);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void setSecure(final boolean on) {
            getSharedPreferences("hb-native", MODE_PRIVATE).edit().putBoolean("secure", on).apply();
            runOnUiThread(() -> { if (on) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
                                  else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE); });
        }

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

        @JavascriptInterface
        public void httpAs(final String id, final String method, final String url, final String auth, final String body, final String certHost) {
            new Thread(() -> {
                int code = 0;
                String text = "";
                HttpURLConnection c = null;
                try {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException();
                    URL u0 = new URL(url);
                    if (url.startsWith("http://") && !homeHost(u0.getHost())) throw new IllegalArgumentException("http only at home");
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
                } catch (Throwable e) {
                    code = 0;
                    String m = e.getMessage();
                    text = "ERR:" + e.getClass().getSimpleName() + (m == null ? "" : ": " + (m.length() > 160 ? m.substring(0, 160) : m));
                } finally {
                    if (c != null) c.disconnect();
                }
                final String js = "window.hbHttpDone&&window.hbHttpDone(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(text) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        /* Selbst-Update */
        @JavascriptInterface
        public String appVersions() {
            try {
                byte[] c = cachedAppFile().exists() ? readAll(new java.io.FileInputStream(cachedAppFile())) : null;
                return "{\"bundled\":" + versionOf(readAll(getAssets().open("index.html"))) + ",\"cached\":" + versionOf(c) + "}";
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public String deviceName() {
            String n = null;
            try { n = android.provider.Settings.Global.getString(getContentResolver(), "device_name"); } catch (Exception ignored) {}
            if (n == null || n.trim().isEmpty()) try { n = android.provider.Settings.Secure.getString(getContentResolver(), "bluetooth_name"); } catch (Exception ignored) {}
            if (n == null || n.trim().isEmpty()) {
                String m = android.os.Build.MODEL == null ? "" : android.os.Build.MODEL, b = android.os.Build.MANUFACTURER == null ? "" : android.os.Build.MANUFACTURER;
                n = m.toLowerCase().startsWith(b.toLowerCase()) || b.isEmpty() ? m : (b.substring(0, 1).toUpperCase() + b.substring(1) + " " + m);
            }
            return n == null ? "" : n.trim();
        }

        @JavascriptInterface
        public String nativeRev() {
            try (InputStream is = getAssets().open("native.txt")) { return new String(readAll(is), StandardCharsets.UTF_8).trim(); }
            catch (Exception e) { return "0"; }
        }

        @JavascriptInterface
        public void ghFetch(final String id, final String url, final String token, final String kind) {
            new Thread(() -> {
                String result = "", err = "";
                try {
                    if (!url.startsWith("https://api.github.com/repos/minghatsu/")) throw new IllegalArgumentException("Adresse nicht erlaubt");
                    if ("json".equals(kind)) getSharedPreferences("hb-native", MODE_PRIVATE).edit().putString("ghkey", token == null ? "" : token).apply();
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(10000); c.setReadTimeout(120000);
                    if (token != null && !token.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + token);
                    c.setRequestProperty("User-Agent", "FinanzMAMI");
                    c.setRequestProperty("Accept", "json".equals(kind) ? "application/vnd.github+json" : "application/octet-stream");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) {
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

        /* App-Sperre */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public boolean biometricAvailable() {
            try {
                BiometricManager bm = getSystemService(BiometricManager.class);
                if (bm == null) return false;
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

        @JavascriptInterface
        public boolean deviceSecure() {
            try {
                android.app.KeyguardManager km = getSystemService(android.app.KeyguardManager.class);
                return km != null && km.isDeviceSecure();
            } catch (Exception e) {
                return false;
            }
        }

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
        public boolean canDocScan() { return true; }

        @JavascriptInterface
        public void scanReceipt(String id, String source) {
            runOnUiThread(() -> { scanId = id; startScan(source); });
        }

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
                Uri uri = FileProvider.getUriForFile(MainActivity.this, MainActivity.this.getPackageName() + ".files", f);
                Intent send = new Intent(Intent.ACTION_SEND).setType("image/jpeg").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> { try { startActivity(Intent.createChooser(send, "Beleg teilen")); } catch (Exception ignored) {} });
                return true;
            } catch (Exception e) {
                return false;
            }
        }
        @JavascriptInterface
        public boolean sendMail(String to, String subject, String body, String imagesJson) {
            try {
                java.util.ArrayList<Uri> uris = new java.util.ArrayList<>();
                File dir = new File(getCacheDir(), "share");
                if (!dir.exists()) dir.mkdirs();
                File[] old = dir.listFiles(); if (old != null) for (File o : old) o.delete();
                org.json.JSONArray arr = new org.json.JSONArray(imagesJson == null || imagesJson.isEmpty() ? "[]" : imagesJson);
                for (int i = 0; i < arr.length() && i < 6; i++) {
                    byte[] bytes = Base64.decode(arr.getString(i), Base64.DEFAULT);
                    File f = new File(dir, "bild-" + (i + 1) + ".jpg");
                    try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
                    uris.add(FileProvider.getUriForFile(MainActivity.this, MainActivity.this.getPackageName() + ".files", f));
                }
                Intent send;
                if (uris.isEmpty()) {
                    send = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"));
                } else {
                    send = new Intent(Intent.ACTION_SEND_MULTIPLE).setType("image/jpeg");
                    send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }
                send.putExtra(Intent.EXTRA_EMAIL, new String[]{ to });
                send.putExtra(Intent.EXTRA_SUBJECT, subject);
                send.putExtra(Intent.EXTRA_TEXT, body);
                final Intent chooser = Intent.createChooser(send, "Feedback senden");
                runOnUiThread(() -> { try { startActivity(chooser); } catch (Exception ignored) {} });
                return true;
            } catch (Exception e) {
                return false;
            }
        }
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
