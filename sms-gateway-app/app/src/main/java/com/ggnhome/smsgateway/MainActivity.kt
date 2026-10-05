package com.ggnhome.smsgateway

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {

    private val navy = Color.parseColor("#003366")
    private val teal = Color.parseColor("#00A79D")
    private val grey = Color.parseColor("#5B6B7B")
    private val bg = Color.parseColor("#F4F7F9")

    private lateinit var statePill: TextView
    private lateinit var connView: TextView
    private lateinit var beatView: TextView
    private lateinit var eventView: TextView
    private lateinit var sentView: TextView
    private lateinit var toggleBtn: Button
    private lateinit var urlInput: EditText
    private lateinit var keyInput: EditText

    private val handler = Handler(Looper.getMainLooper())
    private var testResult = ""
    private val ticker = object : Runnable {
        override fun run() {
            refresh()
            handler.postDelayed(this, 1000)
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun rounded(color: Int, radius: Int = 16) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radius).toFloat()
    }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(Color.WHITE)
        elevation = dp(2).toFloat()
        setPadding(dp(16), dp(16), dp(16), dp(16))
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(12) }
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text
        setTextColor(grey)
        textSize = 12f
        setPadding(0, dp(8), 0, 0)
    }

    private fun value(): TextView = TextView(this).apply {
        setTextColor(Color.parseColor("#1B2A3A"))
        textSize = 15f
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = navy

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        // ---- header: logo + name ----
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(navy)
            setPadding(dp(16), dp(20), dp(16), dp(20))
        }
        header.addView(ImageView(this).apply {
            setImageResource(R.drawable.logo)
            background = rounded(Color.WHITE, 14)
            setPadding(dp(4), dp(4), dp(4), dp(4))
            layoutParams = LinearLayout.LayoutParams(dp(56), dp(56))
        })
        val titles = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), 0, 0, 0)
        }
        titles.addView(TextView(this).apply {
            text = "ggnhome-sms-service"
            setTextColor(Color.WHITE)
            textSize = 19f
            setTypeface(typeface, Typeface.BOLD)
        })
        titles.addView(TextView(this).apply {
            text = "Sends ggnHome OTPs from this phone's SIM"
            setTextColor(Color.parseColor("#B8D4E8"))
            textSize = 12f
        })
        header.addView(titles)
        root.addView(header)

        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(4), dp(16), dp(24))
        }

        // ---- status card ----
        val status = card()
        statePill = TextView(this).apply {
            textSize = 13f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setPadding(dp(12), dp(4), dp(12), dp(4))
        }
        status.addView(statePill)
        status.addView(label("Connection"))
        connView = value().also { status.addView(it) }
        status.addView(label("Last server check"))
        beatView = value().also { status.addView(it) }
        status.addView(label("Last event"))
        eventView = value().also { status.addView(it) }
        status.addView(label("SMS sent by this phone"))
        sentView = value().also { status.addView(it) }
        body.addView(status)

        toggleBtn = Button(this).apply {
            setTextColor(Color.WHITE)
            isAllCaps = false
            textSize = 16f
            setOnClickListener { onToggle() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)
            ).apply { topMargin = dp(16) }
        }
        body.addView(toggleBtn)

        body.addView(Button(this).apply {
            text = "Allow background running (recommended)"
            isAllCaps = false
            setOnClickListener { askIgnoreBatteryOptimizations() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        })

        // ---- device + advanced ----
        val device = card()
        device.addView(label("This device"))
        device.addView(value().apply { text = "${Config.deviceName()}\nID ${Config.deviceId(this@MainActivity).take(8)}" })

        val advanced = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            visibility = View.GONE
        }
        advanced.addView(label("Server URL"))
        urlInput = EditText(this).apply {
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setText(Config.url(this@MainActivity))
        }
        advanced.addView(urlInput)
        advanced.addView(label("Device key"))
        keyInput = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(Config.key(this@MainActivity))
        }
        advanced.addView(keyInput)
        device.addView(TextView(this).apply {
            text = "Advanced settings ▾"
            setTextColor(teal)
            setPadding(0, dp(14), 0, dp(4))
            setOnClickListener {
                advanced.visibility = if (advanced.visibility == View.GONE) View.VISIBLE else View.GONE
            }
        })
        device.addView(advanced)
        body.addView(device)

        root.addView(body)
        setContentView(ScrollView(this).apply {
            setBackgroundColor(bg)
            addView(root)
        })
    }

    override fun onResume() {
        super.onResume()
        handler.post(ticker)
    }

    override fun onPause() {
        handler.removeCallbacks(ticker)
        super.onPause()
    }

    private fun onToggle() {
        val prefs = Config.prefs(this)
        if (prefs.getBoolean(Config.KEY_ENABLED, false)) {
            stopService(Intent(this, GatewayService::class.java))
            prefs.edit().putBoolean(Config.KEY_ENABLED, false).apply()
            testResult = ""
            refresh()
            return
        }

        val url = urlInput.text.toString().trim().trimEnd('/')
        val key = keyInput.text.toString().trim()
        if (!url.startsWith("https://") || key.isEmpty()) {
            testResult = "Server URL must start with https:// and the key can't be empty."
            refresh()
            return
        }
        prefs.edit().putString(Config.KEY_URL, url).putString(Config.KEY_DEVICE, key)
            .putBoolean(Config.KEY_ENABLED, true).apply()

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
            Config.prefs(this).edit().putBoolean(Config.KEY_ENABLED, false).apply()
            testResult = "SMS permission is required to send OTPs."
            refresh()
        }
    }

    private fun startGateway() {
        testResult = "Testing connection…"
        refresh()
        testConnection()
        try {
            startForegroundService(Intent(this, GatewayService::class.java))
        } catch (e: Exception) {
            testResult = "Could not start service: ${e.message}"
        }
        refresh()
    }

    // One-off request so a wrong URL / key is reported immediately.
    private fun testConnection() {
        val url = Config.url(this)
        val key = Config.key(this)
        val id = Config.deviceId(this)
        Thread {
            val result = try {
                val c = URL("$url/sms-gateway/next").openConnection() as HttpURLConnection
                c.connectTimeout = 10000
                c.readTimeout = 15000
                c.setRequestProperty("Authorization", "Bearer $key")
                c.setRequestProperty("X-Device-Id", id)
                c.setRequestProperty("X-Device-Name", Config.deviceName())
                c.setRequestProperty("X-App-Version", Config.APP_VERSION)
                val code = c.responseCode
                c.disconnect()
                when (code) {
                    200, 204 -> "Connected ✔ — phone registered with the server"
                    401 -> "Server reachable but the device key is WRONG"
                    404 -> "Server reachable but gateway route not found (old server version?)"
                    else -> "Server answered HTTP $code"
                }
            } catch (e: Exception) {
                "Cannot reach server: ${e.javaClass.simpleName} ${e.message ?: ""}"
            }
            handler.post { testResult = result; refresh() }
        }.start()
    }

    private fun askIgnoreBatteryOptimizations() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            testResult = "Background running already allowed ✔"
            refresh()
            return
        }
        try {
            startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                    .setData(Uri.parse("package:$packageName"))
            )
        } catch (e: Exception) {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun refresh() {
        val prefs = Config.prefs(this)
        val on = prefs.getBoolean(Config.KEY_ENABLED, false)
        val beat = prefs.getLong(Config.KEY_BEAT, 0L)
        val fresh = beat != 0L && System.currentTimeMillis() - beat < 15000

        statePill.text = when {
            !on -> "STOPPED"
            fresh -> "ONLINE"
            else -> "STARTING…"
        }
        statePill.background = rounded(
            when {
                !on -> Color.parseColor("#8A98A5")
                fresh -> Color.parseColor("#1E9E5A")
                else -> Color.parseColor("#E0A100")
            }, 20
        )
        connView.text = if (testResult.isEmpty()) (if (on) "—" else "Not running") else testResult
        beatView.text = if (beat == 0L) "never"
        else SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(beat))
        eventView.text = prefs.getString(Config.KEY_LAST, "—")
        sentView.text = prefs.getInt(Config.KEY_SENT, 0).toString()

        toggleBtn.text = if (on) "Stop service" else "Start service"
        toggleBtn.background = rounded(if (on) Color.parseColor("#C0392B") else teal, 14)
    }
}
