/**
 * Пауза чужой музыки и книг (Яндекс Музыка, аудиокниги и т.п.), пока звучит подсказка.
 * Просим у Android «временный» аудиофокус: плееры сами встают на паузу,
 * а когда отдаём фокус — сами продолжают. Свой плеер не держим, громкость не трогаем.
 */
import AudioFocus from '../../modules/audio-focus';

let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/** Поставить музыку на паузу (перед фразой) */
export function pauseOthers() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  try {
    AudioFocus?.request();
  } catch {}
}

/** Вернуть музыку чуть позже — чтобы между фразами книга не «дёргалась» */
export function resumeOthersSoon(delayMs = 600) {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(resumeOthers, delayMs);
}

/** Вернуть музыку сразу */
export function resumeOthers() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  try {
    AudioFocus?.abandon();
  } catch {}
}
