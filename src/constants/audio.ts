export const TARGET_SAMPLE_RATE = 16000;
export const TARGET_CHANNELS = 1;
export const FLOAT32_BYTES = 4;

// YAMNet expects 0.975 second frames at 16kHz => 15,600 samples.
export const MODEL_WINDOW_SAMPLES = 15600;
export const MODEL_WINDOW_BYTES = MODEL_WINDOW_SAMPLES * FLOAT32_BYTES;

// Conservative defaults tuned for noisy bedroom audio.
export const SNORING_CLASS_INDEXES = [36, 38] as const;
export const SNORING_SCORE_THRESHOLD = 0.55;

// Merge nearby positive windows to avoid over-counting a sustained snore.
export const EVENT_COOLDOWN_WINDOWS = 2;
