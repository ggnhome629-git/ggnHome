package com.ggnhome.smsgateway

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {

    private lateinit var urlInput: EditText
    private lateinit var keyInput: EditText
    private lateinit var statusView: TextView

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
        refreshStatus()
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
        startForegroundService(Intent(this, GatewayService::class.java))
        refreshStatus()
    }

    private fun refreshStatus() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val on = prefs.getBoolean(KEY_ENABLED, false)
        statusView.text = (if (on) "Running" else "Stopped") + "\nLast: " + prefs.getString(KEY_LAST, "—")
    }

    companion object {
        const val PREFS = "gateway"
        const val KEY_URL = "url"
        const val KEY_DEVICE = "device_key"
        const val KEY_ENABLED = "enabled"
        const val KEY_LAST = "last"
    }
}
