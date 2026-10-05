package com.ggnhome.smsgateway

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.telephony.SmsMessage
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// Hears back from Android about each SMS: did it leave the phone (SENT), and
// did the carrier confirm delivery to the recipient (DELIVERED).
// "Sent" in a messaging app only means the phone handed it to the network.
class SmsStatusReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_SENT = "com.ggnhome.smsgateway.SMS_SENT"
        const val ACTION_DELIVERED = "com.ggnhome.smsgateway.SMS_DELIVERED"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val qid = intent.getStringExtra("qid") ?: return
        val pending = goAsync()
        Thread {
            try {
                when (intent.action) {
                    ACTION_SENT -> if (resultCode != Activity.RESULT_OK) {
                        val why = sendError(resultCode)
                        Config.updateLog(context, qid, false, "Not sent: $why")
                        post(context, qid, "undelivered", "Not sent: $why")
                    }
                    ACTION_DELIVERED -> {
                        val pdu = intent.getByteArrayExtra("pdu")
                        val format = intent.getStringExtra("format")
                        // Status report code: 0 = delivered, 32-63 = still trying, 64+ = failed.
                        val status = try { SmsMessage.createFromPdu(pdu, format).status } catch (_: Exception) { 0 }
                        when {
                            status == 0 -> {
                                Config.updateLog(context, qid, true, "Delivered")
                                post(context, qid, "delivered", "")
                            }
                            status >= 64 -> {
                                Config.updateLog(context, qid, false, "Not delivered (carrier code $status)")
                                post(context, qid, "undelivered", "carrier code $status")
                            }
                            else -> Config.updateLog(context, qid, true, "Sent, carrier still trying ($status)")
                        }
                    }
                }
            } finally {
                pending.finish()
            }
        }.start()
    }

    private fun sendError(code: Int) = when (code) {
        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "generic failure (check SIM balance / SMS plan)"
        SmsManager.RESULT_ERROR_NO_SERVICE -> "no mobile signal"
        SmsManager.RESULT_ERROR_NULL_PDU -> "bad message"
        SmsManager.RESULT_ERROR_RADIO_OFF -> "airplane mode / radio off"
        else -> "error $code"
    }

    private fun post(context: Context, qid: String, status: String, detail: String) {
        try {
            val c = URL("${Config.url(context)}/sms-gateway/$qid/delivery").openConnection() as HttpURLConnection
            c.requestMethod = "POST"
            c.connectTimeout = 10000
            c.readTimeout = 15000
            c.setRequestProperty("Authorization", "Bearer ${Config.key(context)}")
            c.setRequestProperty("X-Device-Id", Config.deviceId(context))
            c.setRequestProperty("Content-Type", "application/json")
            c.doOutput = true
            c.outputStream.use { it.write(JSONObject().put("status", status).put("detail", detail).toString().toByteArray()) }
            c.responseCode
            c.disconnect()
        } catch (_: Exception) {
            // Local log already has it; the server copy is best-effort.
        }
    }
}
