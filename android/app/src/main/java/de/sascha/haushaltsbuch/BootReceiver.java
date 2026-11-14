package de.sascha.haushaltsbuch;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Notifier.restore(c);
        UpdateJob.plan(c);
        BgJob.plan(c);
    }
}
