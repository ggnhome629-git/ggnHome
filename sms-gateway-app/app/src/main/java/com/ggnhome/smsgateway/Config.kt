package com.ggnhome.smsgateway

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import java.util.UUID

// Settings shared by the screen and the background service.
object Config {
    const val DEFAULT_URL = "https://api.ggnhome.com"
    // TESTING default — must match SMS_DEVICE_KEY on the server (or its fallback).
    const val DEFAULT_KEY = "test123"
    const val APP_VERSION = "2.0"

    private const val PREFS = "gateway"
    const val KEY_URL = "url"
    const val KEY_DEVICE = "device_key"
    const val KEY_ENABLED = "enabled"
    const val KEY_LAST = "last"
    const val KEY_BEAT = "beat"
    const val KEY_SENT = "sent_total"
    const val KEY_DEVICE_ID = "device_id"

    fun prefs(c: Context): SharedPreferences = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun url(c: Context): String = prefs(c).getString(KEY_URL, DEFAULT_URL)!!.ifBlank { DEFAULT_URL }.trimEnd('/')
    fun key(c: Context): String = prefs(c).getString(KEY_DEVICE, DEFAULT_KEY)!!.ifBlank { DEFAULT_KEY }

    // Stable per-install id so the server can tell the phones apart.
    fun deviceId(c: Context): String {
        val p = prefs(c)
        return p.getString(KEY_DEVICE_ID, null) ?: UUID.randomUUID().toString().also {
            p.edit().putString(KEY_DEVICE_ID, it).apply()
        }
    }

    fun deviceName(): String {
        val maker = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
        return "$maker ${Build.MODEL}".take(60)
    }
}
