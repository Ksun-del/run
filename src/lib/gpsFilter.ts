/**
 * Сглаживание GPS во время пробежки.
 *
 * Телефонный GPS «дрожит»: каждая точка отскакивает на несколько метров в сторону,
 * и если просто складывать расстояния между точками, зигзаги добавляют лишние метры
 * (в городе — до 10% и больше). Часы с этим борются сглаживанием, мы делаем так же:
 *
 * 1. Фильтр Калмана: каждая новая точка лишь «подтягивает» позицию, тем сильнее,
 *    чем точнее она (accuracy). Шум гасится, реальное движение остаётся.
 * 2. Скорость по эффекту Доплера (coords.speed) — GPS-чип меряет её гораздо точнее,
 *    чем координаты. Если по точкам вышло сильно больше или меньше, чем по скорости,
 *    подтягиваем к скорости (не дальше ±10%).
 * 3. Мелкие сдвиги (дрожание на месте) и невозможные скачки не считаем.
 */
import { haversine } from './geo';

export type RawFix = { lat: number; lon: number; t: number; acc: number | null; speed: number | null };
export type Accepted = { lat: number; lon: number; t: number; d: number };

/** Насколько быстро бегун может «уйти» от прогноза, м/с (шум процесса фильтра) */
const Q_MS = 3;
/** Скачки быстрее этой скорости (м/с ≈ 32 км/ч) считаем ошибкой GPS */
const MAX_SPEED_MS = 9;
/** Меньшие смещения от прошлой точки трека считаем дрожанием на месте */
const MIN_STEP_M = 5;
/** Скорость ниже этой (м/с) считаем стоянием */
const STILL_MS = 0.5;

export class GpsFilter {
  private lat = 0;
  private lon = 0;
  /** дисперсия позиции, м²; < 0 — фильтр пуст */
  private variance = -1;
  private kt = 0;
  private last: { lat: number; lon: number; t: number } | null = null;
  private prevT = 0;
  /** путь по доплеровской скорости с прошлой точки трека, м */
  private doppler = 0;
  private dopplerOk = true;

  /** Начать заново (старт, продолжение после паузы) */
  reset() {
    this.variance = -1;
    this.last = null;
    this.doppler = 0;
    this.dopplerOk = true;
    this.prevT = 0;
  }

  private smooth(f: RawFix) {
    const acc = Math.max(f.acc ?? 15, 3);
    if (this.variance < 0) {
      this.lat = f.lat;
      this.lon = f.lon;
      this.variance = acc * acc;
      this.kt = f.t;
      return;
    }
    const dt = Math.max(0, (f.t - this.kt) / 1000);
    this.kt = f.t;
    this.variance += dt * Q_MS * Q_MS;
    const k = this.variance / (this.variance + acc * acc);
    this.lat += k * (f.lat - this.lat);
    this.lon += k * (f.lon - this.lon);
    this.variance *= 1 - k;
  }

  /** Новая точка GPS. Возвращает точку для трека и сколько метров добавить, или null. */
  push(f: RawFix): Accepted | null {
    // путь по скорости между соседними точками
    if (this.prevT) {
      const dt = (f.t - this.prevT) / 1000;
      // ровно 0 или -1 — телефон скорость не знает; долгий разрыв (пауза) — тоже не считаем
      if (dt > 0 && dt <= 5 && f.speed != null && f.speed > 0) this.doppler += (f.speed < STILL_MS ? 0 : f.speed) * dt;
      else this.dopplerOk = false;
    }
    this.prevT = f.t;

    this.smooth(f);
    const p = { lat: this.lat, lon: this.lon, t: f.t };
    if (!this.last) {
      this.last = p;
      this.doppler = 0;
      this.dopplerOk = true;
      return { ...p, d: 0 };
    }
    const dt = (p.t - this.last.t) / 1000;
    if (dt <= 0) return null;
    let d = haversine(this.last.lat, this.last.lon, p.lat, p.lon);
    if (d / dt > MAX_SPEED_MS) return null;
    if (d < MIN_STEP_M) return null;
    // по координатам не должно выйти сильно больше или меньше, чем по скорости:
    // больше — это зигзаги шума, меньше — сглаживание «срезало» поворот
    if (this.dopplerOk && this.doppler > 0) d = Math.min(Math.max(d, this.doppler * 0.9), this.doppler * 1.1);
    this.last = p;
    this.doppler = 0;
    this.dopplerOk = true;
    return { ...p, d };
  }
}
