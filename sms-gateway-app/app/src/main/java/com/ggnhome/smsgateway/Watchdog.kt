package com.ggnhome.smsgateway

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Keeps the service alive: an alarm re-starts it if Android or the OEM killed it.
object Watchdog {
    private fun pending(c: Context): PendingIntent = PendingIntent.getBroadcast(
        c, 7, Intent(c, WatchdogReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    fun schedule(c: Context, delayMs: Long) {
        val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pending(c))
    }

    fun cancel(c: Context) {
        (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending(c))
    }
}

class WatchdogReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!Config.prefs(context).getBoolean(Config.KEY_ENABLED, false)) return
        try {
            context.startForegroundService(Intent(context, GatewayService::class.java))
        } catch (_: Exception) {
            // Background start blocked (battery optimisation not disabled): try again later.
        }
        Watchdog.schedule(context, 5 * 60 * 1000L)
    }
}
