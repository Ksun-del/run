/** Выгрузка GPX на телефоне (Android): файл во временную папку → меню «Поделиться» */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { buildGpx, gpxFileName } from './gpx';
import type { Run } from './storage';

export async function exportGpx(run: Run): Promise<'shared' | 'unavailable'> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const file = new File(Paths.cache, gpxFileName(run.startedAt));
  if (file.exists) file.delete();
  file.create();
  file.write(buildGpx(run));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', dialogTitle: 'Выгрузить GPX', UTI: 'com.topografix.gpx' });
  return 'shared';
}
