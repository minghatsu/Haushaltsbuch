package de.sascha.haushaltsbuch;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Looks for a new version about every 15 minutes, also while the app is closed,
 * and shows a notification. Tapping it opens the app, which then loads and installs the update.
 */
public class UpdateJob extends JobService {
    static final int JOB_ID = 4711, NOTE_ID = 4711;
    static final String CH_UPD = "updates";
    private static final String REL = "https://api.github.com/repos/minghatsu/Haushaltsbuch/releases/tags/neueste";
    private static final String REL_PUB = "https://api.github.com/repos/minghatsu/finanz-mami/releases/tags/neueste";
    private static final Pattern VERSION = Pattern.compile("name=\"hb-version\" content=\"(\\d+)\"");

    /** Plans the regular check (keeps running after a restart of the phone). */
    static void plan(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null || js.getPendingJob(JOB_ID) != null) return;
        JobInfo ji = new JobInfo.Builder(JOB_ID, new ComponentName(c, UpdateJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        try { js.schedule(ji); } catch (Exception ignored) {}
    }

    @Override
    public boolean onStartJob(final JobParameters p) {
        new Thread(() -> {
            try { check(getApplicationContext()); } catch (Exception ignored) {}
            jobFinished(p, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters p) { return true; }

    private static int num(String body, String k) {
        Matcher m = Pattern.compile("\\b" + k + "=(\\d+)").matcher(body);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private static int versionOf(byte[] html) {
        if (html == null) return 0;
        Matcher m = VERSION.matcher(new String(html, 0, Math.min(html.length, 4000), StandardCharsets.UTF_8));
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
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

    static void check(Context c) throws Exception {
        SharedPreferences sp = c.getSharedPreferences("hb-native", Context.MODE_PRIVATE);
        String key = sp.getString("ghkey", "");
        HttpURLConnection h = (HttpURLConnection) new URL(key.isEmpty() ? REL_PUB : REL).openConnection();
        h.setConnectTimeout(10000); h.setReadTimeout(20000);
        if (!key.isEmpty()) h.setRequestProperty("Authorization", "Bearer " + key);
        h.setRequestProperty("User-Agent", "FinanzMAMI");
        h.setRequestProperty("Accept", "application/vnd.github+json");
        if (h.getResponseCode() != 200) { h.disconnect(); return; }
        String rel = new String(readAll(h.getInputStream()), StandardCharsets.UTF_8); h.disconnect();
        String body = new org.json.JSONObject(rel).optString("body", "");
        int web = num(body, "web"), apk = num(body, "apk");

        int mineApk = 0, mineWeb;
        try (InputStream is = c.getAssets().open("native.txt")) { mineApk = Integer.parseInt(new String(readAll(is), StandardCharsets.UTF_8).trim()); } catch (Exception ignored) {}
        mineWeb = versionOf(readAll(c.getAssets().open("index.html")));
        File f = new File(c.getFilesDir(), "app.html");
        if (f.exists()) mineWeb = Math.max(mineWeb, versionOf(readAll(new FileInputStream(f))));

        boolean newApk = apk > mineApk, newWeb = web > mineWeb;
        if (!newApk && !newWeb) return;
        String mark = web + "/" + apk;
        if (mark.equals(sp.getString("updNoted", ""))) return;   // this version was already announced
        sp.edit().putString("updNoted", mark).apply();
        int m = Math.max(0, web - 88);
        show(c, "Neue Version v0." + (m / 10) + "." + (m % 10) + " ist da",
                newApk ? "Tippe hier – die neue App wird geladen und installiert. Deine Daten bleiben erhalten."
                       : "Tippe hier – die neue Version wird geladen.");
    }

    static void show(Context c, String title, String text) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CH_UPD, "Updates", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Wenn eine neue Version von Finanz MAMI da ist");
        nm.createNotificationChannel(ch);
        Intent open = new Intent(c, MainActivity.class).putExtra("upd", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, NOTE_ID, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, CH_UPD)
                .setSmallIcon(R.drawable.ic_stat)
                .setColor(0xFF147A5B)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        try { nm.notify(NOTE_ID, n); } catch (SecurityException ignored) {}
    }
}
