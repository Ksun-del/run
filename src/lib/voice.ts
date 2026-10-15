import * as Speech from 'expo-speech';
import { pauseOthers, resumeOthersSoon } from './duck';

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function spokenDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${plural(h, 'час', 'часа', 'часов')}`);
  if (m) parts.push(`${m} ${plural(m, 'минута', 'минуты', 'минут')}`);
  if (s || parts.length === 0) parts.push(`${s} ${plural(s, 'секунда', 'секунды', 'секунд')}`);
  return parts.join(' ');
}

function spokenKm(km: number): string {
  if (Number.isInteger(km)) return `${km} ${plural(km, 'километр', 'километра', 'километров')}`;
  const [a, b] = km.toFixed(2).split('.');
  return `${a} и ${Number(b)} сотых километра`;
}

// Фразы, которые сейчас звучат или ждут в очереди. Пока список не пуст — чужая музыка на паузе.
const speaking = new Set<number>();
let nextId = 1;

/** interrupt=false — встать в очередь после текущей фразы. Музыка и книги на время фразы встают на паузу. */
export function say(text: string, interrupt = true, rate = 1.0) {
  try {
    if (interrupt) {
      speaking.clear(); // прерванные фразы больше не держат паузу
      Speech.stop();
    }
    const id = nextId++;
    speaking.add(id);
    pauseOthers();
    const end = () => {
      if (!speaking.delete(id)) return;
      if (speaking.size === 0) resumeOthersSoon();
    };
    Speech.speak(text, { language: 'ru-RU', rate, pitch: 1.0, onDone: end, onStopped: end, onError: end });
    // страховка: если колбэк не пришёл, всё равно вернём музыку
    setTimeout(end, 20000);
  } catch {
    // голос недоступен — просто молчим
    speaking.clear();
    resumeOthersSoon(0);
  }
}

/** Темп коротко: «6 12» (шесть двенадцать), «6 05», «ровно 6» */
function spokenPace(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (s === 0) return `ровно ${m}`;
  return `${m} ${String(s).padStart(2, '0')}`;
}

/** Коротко и чуть быстрее: «3 километра. Темп 6 12.» */
export function announceSplit(km: number, _totalMs: number, lastKmMs: number) {
  say(`${spokenKm(km)}. Темп ${spokenPace(lastKmMs)}.`, true, 1.2);
}

export function announceFinish(distanceM: number, durationMs: number) {
  const km = Math.round(distanceM / 10) / 100;
  const pace = distanceM > 50 ? (durationMs / (distanceM / 1000)) : 0;
  say(
    `Тренировка завершена. ${spokenKm(km)} за ${spokenDuration(durationMs)}.` +
      (pace ? ` Средний темп ${spokenDuration(pace)} на километр.` : ''),
  );
}
