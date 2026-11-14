package com.ggnhome.smsgateway

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Where the two servers are. The addresses are not fixed in the app: they come from the Stashr registry ("ggnhome" for GGN Home,
 * "wethree" for Shine One Estate), so when a server or a website address changes it is changed once on Stashr → Server URLs and every
 * phone follows. The last list read is kept on the phone, and the address built into the app is only the last resort.
 */
object Registry {
    private const val REFRESH_MS = 10 * 60 * 1000L
    private const val RETRY_MS = 60 * 1000L
    @Volatile private var lastTry = 0L

    private fun regKey(s: Svc) = "reg_${s.id}"
    fun updatedKey() = "reg_at"
    fun goodKey(s: Svc) = "good_${s.id}"

    /** The addresses to try for a service, best first. */
    fun bases(ctx: Context, svc: Svc): List<String> {
        val p = Config.prefs(ctx)
        val saved = try { JSONArray(p.getString(regKey(svc), "[]")).let { a -> (0 until a.length()).map { a.getString(it) } } } catch (_: Exception) { emptyList() }
        return Addresses.order(saved, listOf(svc.fallback), p.getString(goodKey(svc), null))
    }

    /** The address in use now (what the screen shows). */
    fun current(ctx: Context, svc: Svc): String = bases(ctx, svc).firstOrNull() ?: svc.fallback

    fun worked(ctx: Context, svc: Svc, base: String) {
        val p = Config.prefs(ctx)
        if (p.getString(goodKey(svc), null) != base) p.edit().putString(goodKey(svc), base).apply()
    }

    /** Reads both lists from the first Stashr server that answers. Returns true when at least one list was updated. */
    fun refresh(ctx: Context): Boolean {
        lastTry = System.currentTimeMillis()
        val p = Config.prefs(ctx)
        var any = false
        for (svc in Config.SERVICES) {
            for (stashr in Addresses.stashrServers(BuildConfig.STASHR_SERVERS)) {
                val urls = try { read(stashr, svc.app) } catch (_: Exception) { null } ?: continue
                p.edit().putString(regKey(svc), JSONArray(urls).toString()).apply()
                any = true
                break
            }
        }
        if (any) p.edit().putLong(updatedKey(), System.currentTimeMillis()).apply()
        return any
    }

    /** Reads again when the list is old (every 10 minutes). */
    fun refreshIfOld(ctx: Context) {
        val at = Config.prefs(ctx).getLong(updatedKey(), 0L)
        if (System.currentTimeMillis() - at >= REFRESH_MS && System.currentTimeMillis() - lastTry >= RETRY_MS) refresh(ctx)
    }

    /** Every address failed: ask Stashr for the current list now (at most once a minute). */
    fun refreshSoon(ctx: Context) {
        if (System.currentTimeMillis() - lastTry >= RETRY_MS) refresh(ctx)
    }

    private fun read(stashr: String, app: String): List<String>? {
        val c = URL("$stashr/registry/$app").openConnection() as HttpURLConnection
        try {
            c.connectTimeout = 10000
            c.readTimeout = 40000          // a Stashr server that was asleep can take a while to wake up
            if (c.responseCode != 200) return null
            val urls = JSONObject(c.inputStream.bufferedReader().use { it.readText() }).optJSONArray("urls") ?: return null
            val out = (0 until urls.length()).mapNotNull { Addresses.clean(urls.optString(it)) }.distinct()
            return out.ifEmpty { null }
        } finally { c.disconnect() }
    }
}
