/** Выгрузка GPX в браузере (iPhone): меню «Поделиться» с файлом, а если его нет — скачивание */
import { buildGpx, gpxFileName } from './gpx';
import type { Run } from './storage';

export async function exportGpx(run: Run): Promise<'shared' | 'unavailable'> {
  const name = gpxFileName(run.startedAt);
  const file = new File([buildGpx(run)], name, { type: 'application/gpx+xml' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'shared';
}
