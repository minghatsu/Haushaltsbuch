package de.sascha.haushaltsbuch;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires a planned notification. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Notifier.show(c, i.getIntExtra("id", 1), i.getStringExtra("title"), i.getStringExtra("text"), i.getStringExtra("ch"));
    }
}
