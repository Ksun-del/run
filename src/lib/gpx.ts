/** Пробежка → GPX-файл (его понимают Strava, часы и сам RUN при загрузке). */
import type { Run } from './storage';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildGpx(run: Pick<Run, 'title' | 'startedAt' | 'points'>): string {
  const segs: string[] = [];
  let cur: string[] = [];
  let seg: number | null = null;
  for (const p of run.points) {
    if (seg !== null && p.seg !== seg && cur.length) {
      segs.push(cur.join('\n'));
      cur = [];
    }
    seg = p.seg;
    const ele = p.alt != null && Number.isFinite(p.alt) ? `<ele>${p.alt.toFixed(1)}</ele>` : '';
    const time = p.t ? `<time>${new Date(p.t).toISOString()}</time>` : '';
    cur.push(`      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">${ele}${time}</trkpt>`);
  }
  if (cur.length) segs.push(cur.join('\n'));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="RUN" xmlns="http://www.topografix.com/GPX/1/1">',
    `  <metadata><time>${new Date(run.startedAt).toISOString()}</time></metadata>`,
    '  <trk>',
    `    <name>${esc(run.title)}</name>`,
    '    <type>running</type>',
    ...segs.map((s) => `    <trkseg>\n${s}\n    </trkseg>`),
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}

/** Имя файла: RUN-2026-10-15-0730.gpx (по местному времени) */
export function gpxFileName(startedAt: number): string {
  const d = new Date(startedAt);
  const z = (n: number) => String(n).padStart(2, '0');
  return `RUN-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.gpx`;
}
