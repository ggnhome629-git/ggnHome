package com.ggnhome.smsgateway

/**
 * The rules for the server addresses (no Android types, so they can be unit-tested): what an address from the Stashr registry
 * is turned into, and in which order the phone tries them.
 */
object Addresses {
    /**
     * "https://we-three-api.onrender.com/api/" -> "https://we-three-api.onrender.com" (the phone adds the service's own path), and
     * "https://api.ggnhome.com" stays as is. Only https addresses are used; anything else is dropped (null).
     */
    fun clean(raw: String?): String? {
        var u = (raw ?: "").trim().trimEnd('/')
        if (u.endsWith("/api", ignoreCase = true)) u = u.dropLast(4).trimEnd('/')
        if (!u.startsWith("https://", ignoreCase = true) || u.length < 12 || u.any { it.isWhitespace() }) return null
        return u
    }

    /**
     * The addresses to try, best first: the one that worked last (only while the registry still lists it), then the registry's order
     * (that is the order set in Stashr), then the address built into the app as a last resort.
     */
    fun order(registry: List<String>, builtIn: List<String>, lastGood: String?): List<String> {
        val reg = registry.mapNotNull { clean(it) }.distinct()
        val good = clean(lastGood)?.takeIf { it in reg }
        return (listOfNotNull(good) + reg + builtIn.mapNotNull { clean(it) }).distinct()
    }

    /** The Stashr servers the registry is read from, in order. */
    fun stashrServers(csv: String): List<String> = csv.split(",").mapNotNull { clean(it) }.distinct()

    /** An answer that means "not this server" (it is down, asleep behind a proxy, or has no such service), so the next address is tried. */
    fun tryNext(code: Int) = code == 404 || code == 408 || code >= 502
}
