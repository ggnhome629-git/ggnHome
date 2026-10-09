package com.ggnhome.smsgateway

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

// The two services this phone can send for. Everything about them (limits, times, which phone does what) is managed
// on the website console; the app only holds the addresses and keys it needs to reach each server.
class Svc(val id: String, val label: String, val base: String, val prefix: String, val key: String) {
    fun url(path: String) = "$base$prefix$path"
}

object Config {
    const val APP_VERSION = "4.0"

    val SERVICES = listOf(
        Svc("ggnhome", "GGN Home", BuildConfig.GGNHOME_URL.trimEnd('/'), "/sms-gateway", BuildConfig.GGNHOME_KEY),
        Svc("shine", "Shine One Estate", BuildConfig.SHINE_URL.trimEnd('/'), "/api/sms-gateway", BuildConfig.SHINE_KEY),
    )

    private const val PREFS = "gateway"
    const val KEY_ENABLED = "enabled"
    const val KEY_DEVICE_ID = "device_id"
    const val KEY_LOG = "log"
    private const val MAX_LOG = 100

    // Per-service status written by the service and shown (read-only) on screen.
    fun beatKey(s: Svc) = "beat_${s.id}"
    fun lastKey(s: Svc) = "last_${s.id}"
    fun sentKey(s: Svc) = "sent_${s.id}"
    fun queueKey(s: Svc) = "queue_${s.id}"
    fun statusKey(s: Svc) = "status_${s.id}"

    fun prefs(c: Context): SharedPreferences = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // Stable per-install id so the servers can tell the phones apart.
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

    fun service(id: String): Svc? = SERVICES.firstOrNull { it.id == id }

    // ---- local history of what this phone sent (message text is never stored) ----
    class LogEntry(val time: Long, val number: String, val ok: Boolean, val detail: String, val qid: String = "", val svc: String = "")

    @Synchronized
    fun appendLog(c: Context, svc: String, number: String, ok: Boolean, detail: String, qid: String = "") {
        val p = prefs(c)
        val old = try { JSONArray(p.getString(KEY_LOG, "[]")) } catch (_: Exception) { JSONArray() }
        val fresh = JSONArray()
        fresh.put(JSONObject().put("t", System.currentTimeMillis()).put("n", number).put("ok", ok).put("d", detail).put("q", qid).put("s", svc))
        for (i in 0 until minOf(old.length(), MAX_LOG - 1)) fresh.put(old.get(i))
        p.edit().putString(KEY_LOG, fresh.toString()).apply()
    }

    fun readLog(c: Context): List<LogEntry> {
        val arr = try { JSONArray(prefs(c).getString(KEY_LOG, "[]")) } catch (_: Exception) { JSONArray() }
        return (0 until arr.length()).map {
            val o = arr.getJSONObject(it)
            LogEntry(o.getLong("t"), o.getString("n"), o.getBoolean("ok"), o.optString("d"), o.optString("q"), o.optString("s"))
        }
    }

    // Delivery report / send error arrives later: update that message's line.
    @Synchronized
    fun updateLog(c: Context, qid: String, ok: Boolean, detail: String) {
        val p = prefs(c)
        val arr = try { JSONArray(p.getString(KEY_LOG, "[]")) } catch (_: Exception) { return }
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            if (o.optString("q") == qid) {
                o.put("ok", ok).put("d", detail)
                break
            }
        }
        p.edit().putString(KEY_LOG, arr.toString()).apply()
    }
}
