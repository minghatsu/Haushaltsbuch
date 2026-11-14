package de.sascha.haushaltsbuch;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public final class Notifier {
    static final String CH_ALERT = "hinweise", CH_REMIND = "erinnerungen";
    private static final String PREFS = "hb-notify", KEY = "list";

    private Notifier() {}

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel a = new NotificationChannel(CH_ALERT, "Warnungen & Hinweise", NotificationManager.IMPORTANCE_HIGH);
        a.setDescription("Budget überschritten, Konto im Minus, Sparziel erreicht …");
        NotificationChannel r = new NotificationChannel(CH_REMIND, "Erinnerungen", NotificationManager.IMPORTANCE_HIGH);
        r.setDescription("Offene Fixkosten, Steuertermine, Ausgaben eintragen, Rückblicke");
        nm.createNotificationChannel(a);
        nm.createNotificationChannel(r);
    }

    static void show(Context c, int id, String title, String text, String ch) {
        channels(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, CH_REMIND.equals(ch) ? CH_REMIND : CH_ALERT)
                .setSmallIcon(R.drawable.ic_stat)
                .setColor(0xFF147A5B)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setPublicVersion(new Notification.Builder(c, CH_REMIND.equals(ch) ? CH_REMIND : CH_ALERT)
                        .setSmallIcon(R.drawable.ic_stat).setColor(0xFF147A5B)
                        .setContentTitle("Finanz MAMI").setContentText("Neue Nachricht – entsperren zum Lesen").build())
                .build();
        try { nm.notify(id, n); } catch (SecurityException ignored) {}
    }

    private static PendingIntent alarmIntent(Context c, JSONObject o, int flags) {
        Intent i = new Intent(c, AlarmReceiver.class)
                .putExtra("id", o.optInt("id"))
                .putExtra("title", o.optString("title"))
                .putExtra("text", o.optString("text"))
                .putExtra("ch", o.optString("ch"));
        return PendingIntent.getBroadcast(c, o.optInt("id"), i, PendingIntent.FLAG_IMMUTABLE | flags);
    }

    static synchronized void schedule(Context c, String json) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        try {
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            for (int k = 0; k < old.length(); k++) {
                PendingIntent pi = alarmIntent(c, old.getJSONObject(k), PendingIntent.FLAG_UPDATE_CURRENT);
                am.cancel(pi);
            }
        } catch (Exception ignored) {}
        JSONArray keep = new JSONArray();
        try {
            JSONArray list = new JSONArray(json == null ? "[]" : json);
            long now = System.currentTimeMillis();
            for (int k = 0; k < list.length() && k < 60; k++) {
                JSONObject o = list.getJSONObject(k);
                long at = o.optLong("at");
                if (at <= now) continue;
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(c, o, PendingIntent.FLAG_UPDATE_CURRENT));
                keep.put(o);
            }
        } catch (Exception ignored) {}
        p.edit().putString(KEY, keep.toString()).apply();
    }

    static void restore(Context c) {
        schedule(c, c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"));
    }
}
