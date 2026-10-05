package com.ggnhome.smsgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.telephony.SmsManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// Foreground service that polls the server for queued SMS and sends them.
class GatewayService : Service() {

    @Volatile private var running = false
    private var worker: Thread? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        // If the system or an OEM task-killer stops us, this alarm brings us back.
        Watchdog.schedule(this, 5 * 60 * 1000L)
        if (!running) {
            running = true
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ggnhome:gateway").apply { acquire() }
            worker = Thread { pollLoop() }.also { it.start() }
        }
        return START_STICKY
    }

    // Swiped away from recents: make sure we come straight back.
    override fun onTaskRemoved(rootIntent: Intent?) {
        if (Config.prefs(this).getBoolean(Config.KEY_ENABLED, false)) Watchdog.schedule(this, 2000L)
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        if (Config.prefs(this).getBoolean(Config.KEY_ENABLED, false)) {
            Watchdog.schedule(this, 5000L)   // killed while it should be running
        } else {
            Watchdog.cancel(this)            // user pressed Stop
        }
        running = false
        worker?.interrupt()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    private fun startInForeground() {
        val channelId = "gateway"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "ggnHome SMS service", NotificationManager.IMPORTANCE_LOW)
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("ggnHome Admin · SMS service running")
            .setContentText("Sending login OTPs from this SIM in the background")
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setOngoing(true)
            .setContentIntent(
                android.app.PendingIntent.getActivity(
                    this, 0, Intent(this, MainActivity::class.java),
                    android.app.PendingIntent.FLAG_IMMUTABLE
                )
            )
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(1, notification)
        }
    }

    private class Resp(val code: Int, val body: String, val pending: Int)

    private fun pollLoop() {
        val prefs = Config.prefs(this)
        val base = Config.url(this)
        val key = Config.key(this)
        val deviceId = Config.deviceId(this)
        val deviceName = Config.deviceName()
        var failures = 0

        while (running) {
            try {
                // Pacing: only take a new message once the cool-down is over and
                // we are under the hourly cap. "Not ready" still checks in, so the
                // server keeps us listed (and routes OTPs to the other phones).
                val now = System.currentTimeMillis()
                val ready = now >= prefs.getLong(Config.KEY_NEXT_SEND, 0L) &&
                    Config.sentLastHour(this) < Config.HOURLY_LIMIT

                val next = request("GET", "$base/sms-gateway/next", key, null, deviceId, deviceName, ready)
                failures = 0
                if (next.code == 200 || next.code == 204) {
                    prefs.edit()
                        .putLong(Config.KEY_BEAT, System.currentTimeMillis())
                        .putInt(Config.KEY_QUEUE, next.pending)
                        .apply()
                }
                if (next.code == 200) {
                    val job = JSONObject(next.body)
                    val id = job.getString("id")
                    val to = job.getString("phoneNumber")
                    try {
                        sendSms(to, job.getString("message"))
                        request("POST", "$base/sms-gateway/$id/result", key, """{"status":"sent"}""", deviceId, deviceName, ready)
                        prefs.edit().putInt(Config.KEY_SENT, prefs.getInt(Config.KEY_SENT, 0) + 1).apply()
                        note("Sent to …${to.takeLast(4)}")
                        Config.appendLog(this, to, true, "Sent")
                    } catch (e: Exception) {
                        val err = JSONObject().put("status", "failed").put("error", e.message ?: "send error")
                        request("POST", "$base/sms-gateway/$id/result", key, err.toString(), deviceId, deviceName, ready)
                        note("Send failed: ${e.message}")
                        Config.appendLog(this, to, false, e.message ?: "send error")
                    }
                    // Cool down before this SIM sends again (random, so it doesn't look automated).
                    val gap = Config.MIN_GAP_MS + (Math.random() * Config.JITTER_MS).toLong()
                    prefs.edit().putLong(Config.KEY_NEXT_SEND, System.currentTimeMillis() + gap).apply()
                }
                if (next.code == 401) note("Wrong device key")
                Thread.sleep(3000)
            } catch (_: InterruptedException) {
                return
            } catch (e: Exception) {
                failures++
                note("Server unreachable (${e.javaClass.simpleName})")
                try { Thread.sleep(minOf(30000L, 3000L * failures)) } catch (_: InterruptedException) { return }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun sendSms(to: String, text: String) {
        val sms = if (Build.VERSION.SDK_INT >= 31) getSystemService(SmsManager::class.java) else SmsManager.getDefault()
        val parts = sms.divideMessage(text)
        sms.sendMultipartTextMessage(to, null, parts, null, null)
    }

    private fun request(method: String, url: String, key: String, body: String?, deviceId: String, deviceName: String, ready: Boolean): Resp {
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 10000
            c.readTimeout = 15000
            c.setRequestProperty("Authorization", "Bearer $key")
            c.setRequestProperty("X-Device-Id", deviceId)
            c.setRequestProperty("X-Device-Name", deviceName)
            c.setRequestProperty("X-App-Version", Config.APP_VERSION)
            c.setRequestProperty("X-Device-Ready", if (ready) "1" else "0")
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = c.responseCode
            val text = if (code == 200) c.inputStream.bufferedReader().use { it.readText() } else ""
            val pending = c.getHeaderField("X-Queue-Pending")?.toIntOrNull() ?: -1
            return Resp(code, text, pending)
        } finally {
            c.disconnect()
        }
    }

    private fun note(s: String) {
        Config.prefs(this).edit().putString(Config.KEY_LAST, s).apply()
    }
}
