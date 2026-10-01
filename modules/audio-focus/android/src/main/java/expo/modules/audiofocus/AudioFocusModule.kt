package expo.modules.audiofocus

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Ставит чужую музыку и книги на паузу, пока звучит голосовая подсказка.
 * Просим «временный» аудиофокус: плееры (Яндекс Музыка, книги) сами встают на паузу,
 * а когда мы его отдаём — сами продолжают. Никаких своих плееров, громкость не трогаем.
 */
class AudioFocusModule : Module() {
  private var request: AudioFocusRequest? = null
  private var held = false
  private val listener = AudioManager.OnAudioFocusChangeListener { }

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("AudioFocus")

    Function("request") {
      val am = audioManager ?: return@Function false
      if (held) return@Function true
      val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
          .setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
              .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
              .build()
          )
          .setAcceptsDelayedFocusGain(false)
          .setOnAudioFocusChangeListener(listener)
          .build()
        request = req
        am.requestAudioFocus(req)
      } else {
        @Suppress("DEPRECATION")
        am.requestAudioFocus(listener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      }
      held = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      held
    }

    Function("abandon") {
      val am = audioManager
      if (am != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          request?.let { am.abandonAudioFocusRequest(it) }
        } else {
          @Suppress("DEPRECATION")
          am.abandonAudioFocus(listener)
        }
      }
      request = null
      held = false
    }
  }
}
