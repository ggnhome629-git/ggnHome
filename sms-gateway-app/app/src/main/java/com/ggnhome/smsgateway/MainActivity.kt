package com.ggnhome.smsgateway

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    private lateinit var urlInput: EditText
    private lateinit var keyInput: EditText
    private lateinit var statusView: TextView
    private val handler = Handler(Looper.getMainLooper())
    private var testResult = ""
    private val ticker = object : Runnable {
        override fun run() {
            refreshStatus()
            handler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        val pad = (16 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }

        root.addView(TextView(this).apply {
            text = "Sends queued OTP SMS from this phone's SIM. Keep this phone on and online."
        })

        urlInput = EditText(this).apply {
            hint = "Server URL (e.g. https://your-app.onrender.com)"
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setText(prefs.getString(KEY_URL, ""))
        }
        keyInput = EditText(this).apply {
            hint = "Device key (SMS_DEVICE_KEY)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(prefs.getString(KEY_DEVICE, ""))
        }
        root.addView(urlInput)
        root.addView(keyInput)

        root.addView(Button(this).apply {
            text = "Save & Start"
            setOnClickListener { saveAndStart() }
        })
        root.addView(Button(this).apply {
            text = "Stop"
            setOnClickListener {
                stopService(Intent(this@MainActivity, GatewayService::class.java))
                prefs.edit().putBoolean(KEY_ENABLED, false).apply()
                refreshStatus()
            }
        })

        statusView = TextView(this).apply { gravity = Gravity.START }
        root.addView(statusView)
        setContentView(root)
    }

    override fun onResume() {
        super.onResume()
        handler.post(ticker)
    }

    override fun onPause() {
        handler.removeCallbacks(ticker)
        super.onPause()
    }

    private fun saveAndStart() {
        val url = urlInput.text.toString().trim().trimEnd('/')
        val key = keyInput.text.toString().trim()
        if (!url.startsWith("https://") || key.isEmpty()) {
            statusView.text = "Enter an https:// server URL and the device key."
            return
        }
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_URL, url).putString(KEY_DEVICE, key).putBoolean(KEY_ENABLED, true).apply()

        val needed = mutableListOf(Manifest.permission.SEND_SMS)
        if (Build.VERSION.SDK_INT >= 33) needed.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = needed.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            requestPermissions(missing.toTypedArray(), 1)
            return
        }
        startGateway()
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        if (checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
            startGateway()
        } else {
            statusView.text = "SMS permission is required to send OTPs."
        }
    }

    private fun startGateway() {
        testResult = "Testing connection…"
        refreshStatus()
        testConnection()
        try {
            startForegroundService(Intent(this, GatewayService::class.java))
        } catch (e: Exception) {
            testResult = "Could not start service: ${e.message}"
        }
        refreshStatus()
    }

    // One-off request so a wrong URL / key is reported immediately.
    private fun testConnection() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val url = prefs.getString(KEY_URL, "") ?: ""
        val key = prefs.getString(KEY_DEVICE, "") ?: ""
        Thread {
            val result = try {
                val c = URL("$url/sms-gateway/next").openConnection() as HttpURLConnection
                c.connectTimeout = 10000
                c.readTimeout = 15000
                c.setRequestProperty("Authorization", "Bearer $key")
                val code = c.responseCode
                c.disconnect()
                when (code) {
                    200, 204 -> "Connection OK ✔ (server reachable, key accepted)"
                    401 -> "Server reachable but the device key is WRONG"
                    404 -> "Server reachable but /sms-gateway/next not found (old server version?)"
                    else -> "Server answered HTTP $code"
                }
            } catch (e: Exception) {
                "Cannot reach server: ${e.javaClass.simpleName} ${e.message ?: ""}"
            }
            handler.post { testResult = result; refreshStatus() }
        }.start()
    }

    private fun refreshStatus() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val on = prefs.getBoolean(KEY_ENABLED, false)
        val beat = prefs.getLong(KEY_BEAT, 0L)
        val beatText = if (beat == 0L) "never"
        else SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(beat))
        statusView.text = (if (on) "Service: ON" else "Service: OFF") +
            "\nConnection test: " + (if (testResult.isEmpty()) "—" else testResult) +
            "\nLast server check: " + beatText +
            "\nLast event: " + prefs.getString(KEY_LAST, "—")
    }

    companion object {
        const val PREFS = "gateway"
        const val KEY_URL = "url"
        const val KEY_DEVICE = "device_key"
        const val KEY_ENABLED = "enabled"
        const val KEY_LAST = "last"
        const val KEY_BEAT = "beat"
    }
}
