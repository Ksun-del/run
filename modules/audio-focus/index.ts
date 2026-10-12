import { requireOptionalNativeModule } from 'expo';

type AudioFocusNative = {
  request(): boolean;
  /** вернуть музыку через delayMs (таймер на стороне Android — работает и при выключенном экране) */
  abandon(delayMs: number): void;
};

/** null в вебе и в старых сборках без этого модуля */
export default requireOptionalNativeModule<AudioFocusNative>('AudioFocus');
