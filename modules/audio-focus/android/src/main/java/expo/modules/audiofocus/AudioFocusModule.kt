package expo.modules.audiofocus

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Ставит чужую музыку и книги на паузу, пока звучит голосовая подсказка.
 * Просим «временный» аудиофокус: плееры (Яндекс Музыка, книги) сами встают на паузу,
 * а когда мы его отдаём — сами продолжают. Никаких своих плееров, громкость не трогаем.
 *
 * Важно: фокус отдаём по таймеру здесь, в Android, а не в JS. При заблокированном экране
 * таймеры JS не срабатывают — из-за этого в 1.3.1 музыка оставалась на паузе.
 */
class AudioFocusModule : Module() {
  private var request: AudioFocusRequest? = null
  private var held = false
  private val listener = AudioManager.OnAudioFocusChangeListener { }
  private val handler = Handler(Looper.getMainLooper())
  private val releaseNow = Runnable { release() }

  /** Страховка: даже если конец фразы не пришёл, музыка вернётся через это время */
  private val safetyMs = 25000L

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  private fun release() {
    handler.removeCallbacks(releaseNow)
    val am = audioManager
    if (am != null && held) {
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

  override fun definition() = ModuleDefinition {
    Name("AudioFocus")

    Function("request") {
      // новая фраза — отменяем запланированный возврат музыки
      handler.removeCallbacks(releaseNow)
      handler.postDelayed(releaseNow, safetyMs)
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

    /** Отдать фокус через delayMs (0 — сразу). Таймер в Android, работает и при выключенном экране. */
    Function("abandon") { delayMs: Int ->
      handler.removeCallbacks(releaseNow)
      if (delayMs <= 0) {
        release()
      } else {
        handler.postDelayed(releaseNow, delayMs.toLong())
      }
      Unit
    }
  }
}
