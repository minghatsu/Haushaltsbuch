package de.sascha.haushaltsbuch;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Sets the planned notifications again after the phone was restarted or the app was updated. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Notifier.restore(c);
        UpdateJob.plan(c);
    }
}
