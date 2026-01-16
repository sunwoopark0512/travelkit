package com.travelkit.app.ui.components

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import android.util.Log

@Composable
fun DebugControlPanel() {
    Button(onClick = { Log.w("OfferUI", "offer_click: debug_force_emit") }) {
        Text("[DEBUG] Force Offer Click Log")
    }
    Button(onClick = { Log.w("CheckoutUI", "checkout_action_view: debug_force_emit") }) {
        Text("[DEBUG] Force Checkout Log")
    }
}
