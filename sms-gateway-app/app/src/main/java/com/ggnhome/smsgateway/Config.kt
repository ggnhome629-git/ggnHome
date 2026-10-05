package com.ggnhome.smsgateway

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

// Settings shared by the screen and the background service.
object Config {
    const val DEFAULT_URL = "https://api.ggnhome.com"
    // TESTING default — must match SMS_DEVICE_KEY on the server (or its fallback).
    const val DEFAULT_KEY = "test123"
    const val APP_VERSION = "3.0"

    private const val PREFS = "gateway"
    const val KEY_URL = "url"
    const val KEY_DEVICE = "device_key"
    const val KEY_ENABLED = "enabled"
    const val KEY_LAST = "last"
    const val KEY_BEAT = "beat"
    const val KEY_SENT = "sent_total"
    const val KEY_DEVICE_ID = "device_id"
    const val KEY_LOG = "log"
    private const val MAX_LOG = 100
    const val KEY_QUEUE = "queue_pending"
    const val KEY_NEXT_SEND = "next_send_at"

    // Anti-block pacing: carriers flag SIMs that fire many SMS back to back.
    // Each phone waits MIN_GAP (+ random jitter, so it doesn't look robotic)
    // between messages and stops taking new ones after HOURLY_LIMIT in an
    // hour; while it waits, the server gives OTPs to the other phones.
    const val MIN_GAP_MS = 8_000L
    const val JITTER_MS = 6_000L
    const val HOURLY_LIMIT = 30

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

    // ---- local history of what this phone sent (OTP codes are never stored) ----
    class LogEntry(val time: Long, val number: String, val ok: Boolean, val detail: String)

    @Synchronized
    fun appendLog(c: Context, number: String, ok: Boolean, detail: String) {
        val p = prefs(c)
        val old = try { JSONArray(p.getString(KEY_LOG, "[]")) } catch (_: Exception) { JSONArray() }
        val fresh = JSONArray()
        fresh.put(JSONObject().put("t", System.currentTimeMillis()).put("n", number).put("ok", ok).put("d", detail))
        for (i in 0 until minOf(old.length(), MAX_LOG - 1)) fresh.put(old.get(i))
        p.edit().putString(KEY_LOG, fresh.toString()).apply()
    }

    fun readLog(c: Context): List<LogEntry> {
        val arr = try { JSONArray(prefs(c).getString(KEY_LOG, "[]")) } catch (_: Exception) { JSONArray() }
        return (0 until arr.length()).map {
            val o = arr.getJSONObject(it)
            LogEntry(o.getLong("t"), o.getString("n"), o.getBoolean("ok"), o.optString("d"))
        }
    }

    fun clearLog(c: Context) = prefs(c).edit().remove(KEY_LOG).apply()

    fun sentLastHour(c: Context): Int {
        val since = System.currentTimeMillis() - 3_600_000L
        return readLog(c).count { it.ok && it.time > since }
    }
}
