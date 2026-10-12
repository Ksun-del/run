/**
 * Пауза чужой музыки и книг (Яндекс Музыка, аудиокниги и т.п.), пока звучит подсказка.
 * Просим у Android «временный» аудиофокус: плееры сами встают на паузу,
 * а когда отдаём фокус — сами продолжают. Свой плеер не держим, громкость не трогаем.
 */
import AudioFocus from '../../modules/audio-focus';

/** Поставить музыку на паузу (перед фразой) */
export function pauseOthers() {
  try {
    AudioFocus?.request();
  } catch {}
}

/**
 * Вернуть музыку чуть позже — чтобы между фразами книга не «дёргалась».
 * Задержку отсчитывает сам Android: при выключенном экране таймеры JS не срабатывают.
 */
export function resumeOthersSoon(delayMs = 600) {
  try {
    AudioFocus?.abandon(delayMs);
  } catch {}
}

/** Вернуть музыку сразу */
export function resumeOthers() {
  resumeOthersSoon(0);
}
