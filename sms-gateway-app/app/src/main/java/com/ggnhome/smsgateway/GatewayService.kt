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
        if (!running) {
            running = true
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ggnhome:gateway").apply { acquire() }
            worker = Thread { pollLoop() }.also { it.start() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        worker?.interrupt()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    private fun startInForeground() {
        val channelId = "gateway"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "SMS Gateway", NotificationManager.IMPORTANCE_LOW)
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("ggnhome-sms-service running")
            .setContentText("Waiting for OTP messages to send")
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(1, notification)
        }
    }

    private fun pollLoop() {
        val prefs = Config.prefs(this)
        val base = Config.url(this)
        val key = Config.key(this)
        val deviceId = Config.deviceId(this)
        val deviceName = Config.deviceName()
        var failures = 0

        while (running) {
            try {
                val next = request("GET", "$base/sms-gateway/next", key, null, deviceId, deviceName)
                failures = 0
                if (next.first == 200 || next.first == 204) {
                    prefs.edit().putLong(Config.KEY_BEAT, System.currentTimeMillis()).apply()
                }
                if (next.first == 200) {
                    val job = JSONObject(next.second)
                    val id = job.getString("id")
                    try {
                        sendSms(job.getString("phoneNumber"), job.getString("message"))
                        request("POST", "$base/sms-gateway/$id/result", key, """{"status":"sent"}""", deviceId, deviceName)
                        prefs.edit().putInt(Config.KEY_SENT, prefs.getInt(Config.KEY_SENT, 0) + 1).apply()
                        note("Sent to …${job.getString("phoneNumber").takeLast(4)}")
                    } catch (e: Exception) {
                        val err = JSONObject().put("status", "failed").put("error", e.message ?: "send error")
                        request("POST", "$base/sms-gateway/$id/result", key, err.toString(), deviceId, deviceName)
                        note("Send failed: ${e.message}")
                    }
                    continue // check immediately for more
                }
                if (next.first == 401) note("Wrong device key")
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

    private fun request(method: String, url: String, key: String, body: String?, deviceId: String, deviceName: String): Pair<Int, String> {
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 10000
            c.readTimeout = 15000
            c.setRequestProperty("Authorization", "Bearer $key")
            c.setRequestProperty("X-Device-Id", deviceId)
            c.setRequestProperty("X-Device-Name", deviceName)
            c.setRequestProperty("X-App-Version", Config.APP_VERSION)
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = c.responseCode
            val text = if (code == 200) c.inputStream.bufferedReader().use { it.readText() } else ""
            return Pair(code, text)
        } finally {
            c.disconnect()
        }
    }

    private fun note(s: String) {
        Config.prefs(this).edit().putString(Config.KEY_LAST, s).apply()
    }
}
