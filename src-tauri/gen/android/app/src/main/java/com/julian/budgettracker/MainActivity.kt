package com.julian.budgettracker

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    instance = this
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  override fun onDestroy() {
    super.onDestroy()
    if (instance == this) {
      instance = null
    }
  }

  companion object {
    var instance: MainActivity? = null
      private set

    @JvmStatic
    fun openExternalUrl(url: String) {
      instance?.let { activity ->
        try {
          val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
          }
          activity.startActivity(intent)
        } catch (e: Exception) {
          e.printStackTrace()
        }
      }
    }
  }
}
