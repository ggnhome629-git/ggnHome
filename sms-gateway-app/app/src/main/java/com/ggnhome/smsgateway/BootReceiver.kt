package com.ggnhome.smsgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Restarts the gateway after a reboot if it was running before.
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val on = Config.prefs(context).getBoolean(Config.KEY_ENABLED, false)
        if (on) {
            try {
                context.startForegroundService(Intent(context, GatewayService::class.java))
            } catch (_: Exception) {
                // Some OEMs block background starts; user can open the app instead.
            }
        }
    }
}
