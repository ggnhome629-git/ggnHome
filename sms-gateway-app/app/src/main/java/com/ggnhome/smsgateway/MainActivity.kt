package com.ggnhome.smsgateway

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
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
import android.view.Gravity
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Read-only status screen. Nothing is configured here: limits, sending times and which service this phone works for
// are all managed on the website console. The only controls are Start/Stop (and the Android permissions they need).
class MainActivity : Activity() {

    private val navy = Color.parseColor("#003366")
    private val teal = Color.parseColor("#00A79D")
    private val grey = Color.parseColor("#5B6B7B")
    private val bg = Color.parseColor("#F4F7F9")

    private class SvcViews(val pill: TextView, val line1: TextView, val line2: TextView, val line3: TextView)

    private val views = HashMap<String, SvcViews>()
    private lateinit var bgView: TextView
    private lateinit var connView: TextView
    private lateinit var logView: TextView
    private lateinit var noteView: TextView
    private lateinit var toggleBtn: Button

    private val handler = Handler(Looper.getMainLooper())
    private var note = ""
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
        textSize = 14f
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = navy

        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(navy, Color.parseColor("#4A6A8A"), teal)
            )
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
            text = "SMS Service"
            setTextColor(Color.WHITE)
            textSize = 19f
            setTypeface(typeface, Typeface.BOLD)
        })
        titles.addView(TextView(this).apply {
            text = "SMS sending or OTP display · managed from the website"
            setTextColor(Color.parseColor("#B8D4E8"))
            textSize = 12f
        })
        header.addView(titles)
        root.addView(header)

        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(4), dp(16), dp(24))
        }

        // One status card per service.
        for (svc in Config.SERVICES) {
            val svcCard = card()
            svcCard.addView(TextView(this).apply {
                text = svc.label
                setTextColor(navy)
                textSize = 16f
                setTypeface(typeface, Typeface.BOLD)
            })
            val pill = TextView(this).apply {
                textSize = 12f
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(Color.WHITE)
                setPadding(dp(12), dp(4), dp(12), dp(4))
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(8) }
            }
            svcCard.addView(pill)
            val l1 = value().apply { setPadding(0, dp(10), 0, 0) }
            val l2 = value().apply { setPadding(0, dp(4), 0, 0) }
            val l3 = value().apply { setPadding(0, dp(4), 0, 0); setTextColor(grey) }
            svcCard.addView(l1)
            svcCard.addView(l2)
            svcCard.addView(l3)
            body.addView(svcCard)
            views[svc.id] = SvcViews(pill, l1, l2, l3)
        }

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
        noteView = TextView(this).apply {
            setTextColor(grey)
            textSize = 13f
            setPadding(0, dp(8), 0, 0)
        }
        body.addView(noteView)

        body.addView(Button(this).apply {
            text = "Allow background running (recommended)"
            isAllCaps = false
            setOnClickListener { askIgnoreBatteryOptimizations() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        })

        // Where the servers are (from the Stashr registry) and the shared SMS key.
        val conn = card()
        conn.addView(label("Connection"))
        connView = value().also { conn.addView(it) }
        conn.addView(Button(this).apply {
            text = "Set SMS key"
            isAllCaps = false
            setOnClickListener { askKey() }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) }
        })
        conn.addView(Button(this).apply {
            text = "Refresh server addresses"
            isAllCaps = false
            setOnClickListener {
                text = "Reading Stashr…"
                Thread {
                    val ok = Registry.refresh(this@MainActivity)
                    runOnUiThread { text = "Refresh server addresses"; connNote = if (ok) "Addresses updated from Stashr." else "Could not reach Stashr; keeping the last addresses."; refresh() }
                }.start()
            }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) }
        })
        body.addView(conn)

        val device = card()
        device.addView(label("This phone"))
        device.addView(value().apply { text = "${Config.deviceName()}\nID ${Config.deviceId(this@MainActivity).take(8)} · v${Config.APP_VERSION}" })
        device.addView(label("Background running"))
        bgView = value().also { device.addView(it) }
        body.addView(device)

        val history = card()
        history.addView(TextView(this).apply {
            text = "Recent messages"
            setTextColor(navy)
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
        })
        logView = TextView(this).apply {
            setTextColor(Color.parseColor("#1B2A3A"))
            textSize = 12f
            typeface = Typeface.MONOSPACE
            setPadding(0, dp(8), 0, 0)
        }
        history.addView(logView)
        body.addView(history)

        root.addView(body)
        setContentView(ScrollView(this).apply {
            setBackgroundColor(bg)
            addView(root)
        })
    }

    @Volatile private var connNote = ""

    /** Types (or clears) the shared SMS key; it must be the SMS_KEY set on both servers. */
    private fun askKey() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "SMS key"
            setPadding(dp(20), dp(12), dp(20), dp(12))
        }
        AlertDialog.Builder(this)
            .setTitle("SMS key")
            .setMessage("The shared key that both servers expect (their SMS_KEY). It is kept only on this phone.")
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val v = input.text.toString().trim()
                if (v.isNotEmpty()) Config.prefs(this).edit().putString(Config.KEY_SMS_KEY, v).apply()
                connNote = if (v.isNotEmpty()) "Key saved." else ""
                refresh()
            }
            .setNeutralButton("Use the built-in key") { _, _ ->
                Config.prefs(this).edit().remove(Config.KEY_SMS_KEY).apply()
                connNote = "Using the key built into the app."
                refresh()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        Thread { try { Registry.refreshIfOld(this) } catch (_: Exception) { } }.start()
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
            note = ""
            refresh()
            return
        }
        prefs.edit().putBoolean(Config.KEY_ENABLED, true).apply()

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
            note = "SMS permission is required to send messages."
            refresh()
        }
    }

    private fun startGateway() {
        try {
            startForegroundService(Intent(this, GatewayService::class.java))
            note = ""
        } catch (e: Exception) {
            note = "Could not start service: ${e.message}"
        }
        refresh()
        // Without this exemption Android may stop the service when the screen is off.
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) askIgnoreBatteryOptimizations()
    }

    private fun askIgnoreBatteryOptimizations() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(packageName)) {
            note = "Background running already allowed ✔"
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
        val hhmmss = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

        for (svc in Config.SERVICES) {
            val v = views[svc.id] ?: continue
            val beat = prefs.getLong(Config.beatKey(svc), 0L)
            val fresh = beat != 0L && System.currentTimeMillis() - beat < 15000
            v.pill.text = when {
                !on -> "STOPPED"
                fresh -> "ONLINE"
                else -> "CONNECTING…"
            }
            v.pill.background = rounded(
                when {
                    !on -> Color.parseColor("#8A98A5")
                    fresh -> Color.parseColor("#1E9E5A")
                    else -> Color.parseColor("#E0A100")
                }, 20
            )
            val pending = prefs.getInt(Config.queueKey(svc), -1)
            v.line1.text = "Sent by this phone: ${prefs.getInt(Config.sentKey(svc), 0)}" +
                (if (pending >= 0) " · waiting: $pending" else "")
            v.line2.text = statusLine(prefs.getString(Config.statusKey(svc), null))
            v.line3.text = "Last check ${if (beat == 0L) "never" else hhmmss.format(Date(beat))} · ${prefs.getString(Config.lastKey(svc), "—")}"
        }

        noteView.text = note

        val regAt = prefs.getLong(Registry.updatedKey(), 0L)
        val typed = prefs.getString(Config.KEY_SMS_KEY, "").orEmpty().isNotBlank()
        connView.text = Config.SERVICES.joinToString("\n") { "${it.label}: ${Registry.current(this, it).removePrefix("https://")}" } + "\n" +
            (if (regAt == 0L) "Addresses: built-in (Stashr not read yet)" else "Addresses from Stashr, read ${hhmmss.format(Date(regAt))}") + "\n" +
            when {
                typed -> "SMS key: set on this phone ✔"
                Config.keyIsPlaceholder(this) -> "SMS key: ✘ not set (the build has only a test key, the servers refuse it): tap “Set SMS key”"
                else -> "SMS key: built into the app ✔"
            } + (if (connNote.isNotEmpty()) "\n$connNote" else "")
        connView.setTextColor(if (!typed && Config.keyIsPlaceholder(this)) Color.parseColor("#C0392B") else Color.parseColor("#1B2A3A"))

        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val unrestricted = pm.isIgnoringBatteryOptimizations(packageName)
        bgView.text = if (unrestricted) "Allowed ✔ (keeps running when the screen is off)"
        else "Restricted ✘ — tap “Allow background running”"
        bgView.setTextColor(if (unrestricted) Color.parseColor("#1E9E5A") else Color.parseColor("#C0392B"))

        val entries = Config.readLog(this)
        logView.text = if (entries.isEmpty()) "Nothing sent yet." else {
            val fmt = SimpleDateFormat("dd MMM HH:mm:ss", Locale.getDefault())
            entries.take(40).joinToString("\n") {
                val mark = if (it.ok) "✔ ${it.detail}" else "✘ ${it.detail}"
                val tag = Config.service(it.svc)?.label?.take(1) ?: "?"
                "${fmt.format(Date(it.time))} $tag ${it.number} $mark"
            }
        }

        toggleBtn.text = if (on) "Stop service" else "Start service"
        toggleBtn.background = rounded(if (on) Color.parseColor("#C0392B") else teal, 14)
    }

    // Turns the server's /status reply into one readable line (whatever fields that server sends).
    private fun statusLine(json: String?): String {
        if (json.isNullOrBlank()) return "Waiting for the server…"
        return try {
            val o = JSONObject(json)
            val parts = ArrayList<String>()
            if (o.has("enabled") && !o.optBoolean("enabled", true)) parts.add("Switched off for this phone (website)")
            if (o.optBoolean("paused", false)) parts.add("Paused (website)")
            if (o.has("sentToday") && o.has("dailyLimit")) parts.add("Today ${o.getInt("sentToday")}/${o.getInt("dailyLimit")}")
            when (o.optString("window", "")) {
                "lunch" -> parts.add("Lunch window open")
                "night" -> parts.add("Night window open")
                else -> if (o.has("window")) parts.add("Outside sending times")
            }
            if (parts.isEmpty()) "Connected" else parts.joinToString(" · ")
        } catch (_: Exception) {
            "Connected"
        }
    }
}
