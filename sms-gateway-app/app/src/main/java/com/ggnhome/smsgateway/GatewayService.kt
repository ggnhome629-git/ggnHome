package com.ggnhome.smsgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
import java.util.concurrent.atomic.AtomicInteger

// Each service normally sends queued SMS from this SIM. For GGN Home only, the admin can switch OTPs to app-preview mode;
// in that mode this phone displays the OTP and does not send that OTP as an SMS.
class GatewayService : Service() {

    @Volatile private var running = false
    private val workers = ArrayList<Thread>()
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        // If the system or an OEM task-killer stops us, this alarm brings us back.
        Watchdog.schedule(this, 5 * 60 * 1000L)
        if (!running) {
            running = true
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "smsservice:gateway").apply { acquire() }
            for (svc in Config.SERVICES) {
                workers.add(Thread { pollLoop(svc) }.also { it.start() })
            }
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
        workers.forEach { it.interrupt() }
        workers.clear()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    private fun startInForeground() {
        val channelId = "gateway"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "SMS Service", NotificationManager.IMPORTANCE_LOW)
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("SMS Service running")
            .setContentText("SMS sending or OTP display is controlled by the admin")
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setOngoing(true)
            .setContentIntent(
                PendingIntent.getActivity(
                    this, 0, Intent(this, MainActivity::class.java),
                    PendingIntent.FLAG_IMMUTABLE
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

    private fun pollLoop(svc: Svc) {
        val prefs = Config.prefs(this)
        val deviceId = Config.deviceId(this)
        val deviceName = Config.deviceName()
        var failures = 0
        var lastStatusAt = 0L

        while (running) {
            try {
                var previewMode = false
                var allowSmsSend = svc.id != "ggnhome"
                if (svc.id == "ggnhome") {
                    // This endpoint reports whether the admin selected app-only OTP display.
                    val preview = request("GET", svc.url("/otp-preview"), svc.key, null, deviceId, deviceName)
                    if (preview.code == 200) {
                        prefs.edit().putLong(Config.beatKey(svc), System.currentTimeMillis()).apply()
                        val payload = JSONObject(preview.body)
                        previewMode = payload.optBoolean("enabled", false)
                        allowSmsSend = !previewMode
                        val messages = payload.optJSONArray("messages")
                        if (previewMode && messages != null) {
                            for (i in 0 until messages.length()) {
                                val item = messages.optJSONObject(i) ?: continue
                                val id = item.optString("id")
                                val otp = item.optString("otp")
                                val phone = item.optString("phoneNumber")
                                if (id.isBlank() || otp.isBlank()) continue
                                val seenKey = "otp_seen_$id"
                                if (prefs.getBoolean(seenKey, false)) continue
                                prefs.edit().putBoolean(seenKey, true).apply()
                                showOtpNotification(phone, otp)
                                prefs.edit().putInt(Config.sentKey(svc), prefs.getInt(Config.sentKey(svc), 0) + 1).apply()
                                note(svc, "OTP available for …${phone.takeLast(4)}")
                                Config.appendLog(this, svc.id, phone, true, "OTP shown in app", id)
                            }
                        }
                    } else if (preview.code == 401) {
                        note(svc, "Wrong device key")
                    }
                }

                // In preview mode, never claim/send GGN Home messages. Otherwise keep the original SMS flow.
                if (allowSmsSend) {
                    val next = request("GET", svc.url("/next"), svc.key, null, deviceId, deviceName)
                    failures = 0
                    if (next.code == 200 || next.code == 204) {
                        prefs.edit()
                            .putLong(Config.beatKey(svc), System.currentTimeMillis())
                            .putInt(Config.queueKey(svc), next.pending)
                            .apply()
                    }
                    if (next.code == 200) {
                        val job = JSONObject(next.body)
                        val id = job.getString("id")
                        val to = job.getString("phoneNumber")
                        try {
                            sendSms(to, job.getString("message"), id, svc.id)
                            request("POST", svc.url("/$id/result"), svc.key, """{"status":"sent"}""", deviceId, deviceName)
                            prefs.edit().putInt(Config.sentKey(svc), prefs.getInt(Config.sentKey(svc), 0) + 1).apply()
                            note(svc, "Sent to …${to.takeLast(4)}")
                            Config.appendLog(this, svc.id, to, true, "Sent, waiting for delivery report", id)
                        } catch (e: Exception) {
                            val err = JSONObject().put("status", "failed").put("error", e.message ?: "send error")
                            request("POST", svc.url("/$id/result"), svc.key, err.toString(), deviceId, deviceName)
                            note(svc, "Send failed: ${e.message}")
                            Config.appendLog(this, svc.id, to, false, e.message ?: "send error", id)
                        }
                    }
                    if (next.code == 401) note(svc, "Wrong device key")
                } else if (previewMode) {
                    note(svc, "App OTP display enabled by admin")
                } else {
                    note(svc, "Could not confirm OTP mode; SMS sending paused")
                }

                if (System.currentTimeMillis() - lastStatusAt > 20_000L) {
                    lastStatusAt = System.currentTimeMillis()
                    try {
                        val st = request("GET", svc.url("/status"), svc.key, null, deviceId, deviceName)
                        if (st.code == 200) prefs.edit().putString(Config.statusKey(svc), st.body).apply()
                    } catch (_: Exception) { }
                }
                Thread.sleep(3000)
            } catch (_: InterruptedException) {
                return
            } catch (e: Exception) {
                failures++
                note(svc, "Server unreachable (${e.javaClass.simpleName})")
                try { Thread.sleep(minOf(30000L, 3000L * failures)) } catch (_: InterruptedException) { return }
            }
        }
    }

    private fun showOtpNotification(phone: String, otp: String) {
        val channelId = "otp-viewer"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "Login OTPs", NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("GGN Home login OTP")
            .setContentText("$otp · phone ending ${phone.takeLast(4)}")
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setStyle(Notification.BigTextStyle().bigText("OTP: $otp\\nFor phone ending ${phone.takeLast(4)}"))
            .setSmallIcon(android.R.drawable.stat_notify_chat)
            .setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(
                this, 0, Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            ))
            .build()
        nm.notify((phone + otp).hashCode() and 0x7fffffff, notification)
    }

    private val requestCodes = AtomicInteger(1000)

    @Suppress("DEPRECATION")
    private fun sendSms(to: String, text: String, queueId: String, svcId: String) {
        val sms = if (Build.VERSION.SDK_INT >= 31) getSystemService(SmsManager::class.java) else SmsManager.getDefault()
        val parts = sms.divideMessage(text)
        val sentIntents = ArrayList<PendingIntent>()
        val deliveryIntents = ArrayList<PendingIntent>()
        for (i in parts.indices) {
            // Android needs a unique requestCode per PendingIntent (extras don't count).
            sentIntents.add(statusIntent(SmsStatusReceiver.ACTION_SENT, queueId, to, svcId))
            deliveryIntents.add(statusIntent(SmsStatusReceiver.ACTION_DELIVERED, queueId, to, svcId))
        }
        sms.sendMultipartTextMessage(to, null, parts, sentIntents, deliveryIntents)
    }

    private fun statusIntent(action: String, queueId: String, to: String, svcId: String): PendingIntent =
        PendingIntent.getBroadcast(
            this,
            requestCodes.incrementAndGet(),
            Intent(this, SmsStatusReceiver::class.java).setAction(action)
                .putExtra("qid", queueId).putExtra("to", to).putExtra("svc", svcId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

    private fun request(method: String, url: String, key: String, body: String?, deviceId: String, deviceName: String): Resp {
        val c = URL(url).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 15000
            // The free Shine One server can take about a minute to wake up on the first request.
            c.readTimeout = 70000
            c.setRequestProperty("Authorization", "Bearer $key")
            c.setRequestProperty("X-Device-Id", deviceId)
            c.setRequestProperty("X-Device-Name", deviceName)
            c.setRequestProperty("X-App-Version", Config.APP_VERSION)
            c.setRequestProperty("X-Device-Ready", "1")
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

    private fun note(svc: Svc, s: String) {
        Config.prefs(this).edit().putString(Config.lastKey(svc), s).apply()
    }
}
