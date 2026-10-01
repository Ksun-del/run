import { requireOptionalNativeModule } from 'expo';

type AudioFocusNative = { request(): boolean; abandon(): void };

/** null в вебе и в старых сборках без этого модуля */
export default requireOptionalNativeModule<AudioFocusNative>('AudioFocus');
