package com.ggnhome.smsgateway

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AddressesTest {
    @Test fun cleansAddressesFromTheRegistry() {
        assertEquals("https://we-three-api.onrender.com", Addresses.clean("https://we-three-api.onrender.com/api"))
        assertEquals("https://we-three-api.onrender.com", Addresses.clean(" https://we-three-api.onrender.com/api/ "))
        assertEquals("https://ggnhome-server.onrender.com", Addresses.clean("https://ggnhome-server.onrender.com/"))
        assertEquals("https://api.ggnhome.com", Addresses.clean("https://api.ggnhome.com"))
    }

    @Test fun dropsAddressesThatAreNotUsable() {
        assertNull(Addresses.clean("http://insecure.example.com"))
        assertNull(Addresses.clean(""))
        assertNull(Addresses.clean(null))
        assertNull(Addresses.clean("https://"))
        assertNull(Addresses.clean("https://bad host.com"))
    }

    @Test fun triesTheRegistryInStashrOrderThenTheBuiltInAddress() {
        val got = Addresses.order(listOf("https://a.example.com", "https://b.example.com/api"), listOf("https://fallback.example.com"), null)
        assertEquals(listOf("https://a.example.com", "https://b.example.com", "https://fallback.example.com"), got)
    }

    @Test fun theAddressThatWorkedLastGoesFirstOnlyWhileTheRegistryStillListsIt() {
        val reg = listOf("https://a.example.com", "https://b.example.com")
        assertEquals("https://b.example.com", Addresses.order(reg, emptyList(), "https://b.example.com").first())
        // removed from the registry on Stashr: no longer preferred
        assertEquals("https://a.example.com", Addresses.order(reg, emptyList(), "https://old.example.com").first())
    }

    @Test fun withNothingReadYetTheBuiltInAddressIsUsed() {
        assertEquals(listOf("https://fallback.example.com"), Addresses.order(emptyList(), listOf("https://fallback.example.com"), null))
    }

    @Test fun repeatsAreDroppedAndTheStashrListIsCleaned() {
        assertEquals(listOf("https://a.example.com"), Addresses.order(listOf("https://a.example.com", "https://a.example.com/"), listOf("https://a.example.com"), null))
        assertEquals(listOf("https://s1.example.com", "https://s2.example.com"), Addresses.stashrServers("https://s1.example.com/, https://s2.example.com ,http://no.example.com,"))
    }

    @Test fun passesToTheNextAddressOnlyWhenThisOneIsNotTheServer() {
        for (c in listOf(404, 408, 502, 503, 504)) assertTrue("$c", Addresses.tryNext(c))
        for (c in listOf(200, 204, 400, 401, 403, 429, 500)) assertFalse("$c", Addresses.tryNext(c))
    }
}
