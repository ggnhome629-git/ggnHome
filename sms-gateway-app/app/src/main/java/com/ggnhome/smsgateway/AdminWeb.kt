package com.ggnhome.smsgateway

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Environment
import android.view.Gravity
import android.view.View
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast

/**
 * The full ggnHome website admin, inside the app. It is the real website
 * (same pages, same UI, same login), so every admin feature works exactly as
 * it does in a browser — and new admin features appear here automatically.
 */
class AdminWeb(private val activity: Activity) {

    companion object {
        const val SITE = "https://www.ggnhome.com"
        const val ADMIN_HOME = "$SITE/admin/Landingpage"
        const val LOGIN = "$SITE/login"
        const val FILE_REQUEST = 4242
    }

    lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var titleView: TextView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var loaded = false

    private fun dp(v: Int) = (v * activity.resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    fun build(): View {
        val root = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }

        // ---- top bar in the website's brand gradient ----
        val bar = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.parseColor("#003366"), Color.parseColor("#4A6A8A"), Color.parseColor("#00A79D"))
            )
            setPadding(dp(12), dp(10), dp(8), dp(10))
        }
        bar.addView(ImageView(activity).apply {
            setImageResource(R.drawable.logo)
            background = GradientDrawable().apply { setColor(Color.WHITE); cornerRadius = dp(10).toFloat() }
            setPadding(dp(3), dp(3), dp(3), dp(3))
            layoutParams = LinearLayout.LayoutParams(dp(36), dp(36))
        })
        titleView = TextView(activity).apply {
            text = "ggnHome Admin"
            setTextColor(Color.WHITE)
            textSize = 17f
            setTypeface(typeface, Typeface.BOLD)
            setPadding(dp(10), 0, 0, 0)
            maxLines = 1
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        bar.addView(titleView)
        bar.addView(barButton("Admin") { webView.loadUrl(ADMIN_HOME) })
        bar.addView(barButton("Login") { webView.loadUrl(LOGIN) })
        bar.addView(barButton("⟳") { webView.reload() })
        root.addView(bar)

        progress = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(3))
        }
        root.addView(progress)

        webView = WebView(activity).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true        // the site keeps its access token in localStorage
            settings.databaseEnabled = true
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.userAgentString = settings.userAgentString + " ggnhome-sms-service/" + Config.APP_VERSION
        }
        // The site (www) talks to api.ggnhome.com with cookies: allow them.
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host ?: return false
                if (uri.scheme == "https" && (host == "ggnhome.com" || host.endsWith(".ggnhome.com"))) return false
                // Phone/WhatsApp/mail and other sites open outside the app.
                return try {
                    activity.startActivity(Intent(Intent.ACTION_VIEW, uri)); true
                } catch (_: Exception) { true }
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                progress.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView, url: String?) {
                progress.visibility = View.GONE
                CookieManager.getInstance().flush()  // keep the login after the app is closed
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress.progress = newProgress
            }

            override fun onReceivedTitle(view: WebView, title: String?) {
                if (!title.isNullOrBlank()) titleView.text = title
            }

            // <input type="file"> — property photos, bulk-upload sheets, etc.
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val intent = params.createIntent().apply {
                    if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                return try {
                    activity.startActivityForResult(intent, FILE_REQUEST); true
                } catch (_: Exception) {
                    fileCallback = null; false
                }
            }
        }

        // Normal file links (not blob: exports) go to the Downloads folder.
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            if (!url.startsWith("http")) {
                Toast.makeText(activity, "This export can't be saved from the app — use a browser.", Toast.LENGTH_LONG).show()
                return@setDownloadListener
            }
            val name = URLUtil.guessFileName(url, contentDisposition, mimeType)
            val req = DownloadManager.Request(Uri.parse(url))
                .setMimeType(mimeType)
                .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                .addRequestHeader("User-Agent", userAgent)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
            (activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
            Toast.makeText(activity, "Downloading $name", Toast.LENGTH_SHORT).show()
        }

        root.addView(webView)
        return root
    }

    /** Loads the admin the first time the tab is opened (not at app start). */
    fun ensureLoaded() {
        if (!loaded) {
            loaded = true
            webView.loadUrl(ADMIN_HOME)
        }
    }

    fun onFileResult(resultCode: Int, data: Intent?) {
        val cb = fileCallback ?: return
        fileCallback = null
        if (resultCode != Activity.RESULT_OK || data == null) {
            cb.onReceiveValue(null); return
        }
        val clip = data.clipData
        val uris = if (clip != null) Array(clip.itemCount) { clip.getItemAt(it).uri }
        else WebChromeClient.FileChooserParams.parseResult(resultCode, data) ?: emptyArray()
        cb.onReceiveValue(uris)
    }

    /** true if the WebView handled Back (went to the previous page). */
    fun goBack(): Boolean {
        if (webView.canGoBack()) { webView.goBack(); return true }
        return false
    }

    private fun barButton(label: String, onClick: () -> Unit) = TextView(activity).apply {
        text = label
        setTextColor(Color.WHITE)
        textSize = 13f
        setTypeface(typeface, Typeface.BOLD)
        background = GradientDrawable().apply {
            setColor(Color.parseColor("#33FFFFFF"))
            cornerRadius = dp(14).toFloat()
        }
        setPadding(dp(10), dp(5), dp(10), dp(5))
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { leftMargin = dp(6) }
        setOnClickListener { onClick() }
    }
}
