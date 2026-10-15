/**
 * «Темп сейчас» без скачков, когда GPS глушат.
 *
 * В зоне глушения телефон то теряет сигнал, то выдаёт точки с плохой точностью
 * или «телепортом». Темп по таким точкам прыгает: 4:30 → 11:00 → 5:10.
 * Поэтому:
 * 1. Пока GPS слабый — показываем последний нормальный темп (не дольше 3 минут).
 * 2. Когда сигнал вернулся — первые секунды считаем темп только по свежим
 *    хорошим точкам, чтобы в расчёт не попал «мусор» из зоны глушения.
 * 3. Резкую смену темпа (больше чем на 35%) показываем, только если она держится
 *    6 секунд: настоящее ускорение остаётся, одиночный скачок GPS — нет.
 */
import { haversine, type TrackPoint } from './geo';

/** Хорошая точность, м */
const GOOD_ACC_M = 20;
/** Нет новых точек трека дольше этого — сигнал пропал */
const STALE_MS = 6000;
/** Сколько держать старый темп, пока GPS слабый */
const HOLD_MAX_MS = 3 * 60 * 1000;
/** Резкая смена темпа должна продержаться столько, чтобы мы ей поверили */
const JUMP_CONFIRM_MS = 6000;
const JUMP_RATIO = 0.35;
/** Окно расчёта темпа */
const WINDOW_MS = 30000;

/** Темп (с/км) по последним ~30 с текущего отрезка, только по точкам не раньше `since` */
export function rawPace(points: TrackPoint[], seg: number, since = 0): number | null {
  const last = points[points.length - 1];
  if (!last || last.seg !== seg) return null;
  let d = 0;
  let i = points.length - 1;
  while (i > 0 && points[i - 1].seg === seg && last.t - points[i - 1].t <= WINDOW_MS && points[i - 1].t >= since) {
    d += haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    i--;
  }
  const dt = last.t - points[i].t;
  if (d < 20 || dt < 8000) return null;
  return dt / 1000 / (d / 1000);
}

export type PaceView = { pace: number | null; weak: boolean };

export class PaceHold {
  private seg = -1;
  private held: number | null = null;
  private heldAt = 0;
  /** с какого момента GPS снова хороший; null — сейчас слабый */
  private goodSince: number | null = null;
  /** был ли слабый GPS с прошлого нормального темпа (для подписи) */
  private hadWeak = false;
  /** точки раньше этого момента в расчёт не берём: они из зоны слабого GPS */
  private cleanFrom = 0;
  private wasWeak = false;
  private jump: { pace: number; since: number } | null = null;

  update(now: number, points: TrackPoint[], seg: number, acc: number | null | undefined): PaceView {
    if (seg !== this.seg) {
      this.seg = seg;
      this.held = null;
      this.goodSince = null;
      this.hadWeak = false;
      this.cleanFrom = 0;
      this.wasWeak = false;
      this.jump = null;
    }
    const last = points[points.length - 1];
    const fresh = !!last && last.seg === seg && now - last.t <= STALE_MS;
    const good = fresh && acc != null && acc <= GOOD_ACC_M;

    if (!good) {
      if (this.held != null || last?.seg === seg) {
        this.hadWeak = true;
        this.wasWeak = true;
      }
      this.goodSince = null;
      this.jump = null;
      if (this.held != null && now - this.heldAt > HOLD_MAX_MS) this.held = null;
      return { pace: this.held, weak: this.held != null || this.hadWeak };
    }
    if (this.goodSince == null) this.goodSince = now;
    // сигнал вернулся — всё, что было до этого, в расчёт не берём
    if (this.wasWeak) {
      this.cleanFrom = this.goodSince - 1000;
      this.wasWeak = false;
    }
    const p = rawPace(points, seg, this.cleanFrom);
    if (p == null) {
      // данных пока мало — держим прошлый темп, если он есть
      if (this.held != null && now - this.heldAt > HOLD_MAX_MS) this.held = null;
      return { pace: this.held, weak: this.hadWeak && this.held != null };
    }

    if (this.held != null && Math.abs(p - this.held) / this.held > JUMP_RATIO) {
      if (!this.jump || Math.abs(p - this.jump.pace) / this.jump.pace > JUMP_RATIO) {
        this.jump = { pace: p, since: now };
      }
      if (now - this.jump.since < JUMP_CONFIRM_MS) return { pace: this.held, weak: false };
    }
    this.jump = null;
    this.held = p;
    this.heldAt = now;
    this.hadWeak = false;
    return { pace: p, weak: false };
  }
}
