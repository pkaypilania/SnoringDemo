# SnoringDemo

SnoringDemo is a React Native AI audio analysis demo that records voice/audio,
converts it to model-ready PCM, and predicts whether snoring exists.

This repository is designed as a practical reference for:

- How to integrate a TensorFlow Lite model in React Native
- How to process audio in React Native with AI
- How to build audio prediction pipelines in React Native
- How to detect snoring from recorded audio on mobile

## Why this demo exists

Many mobile AI demos stop at model loading. This project focuses on a full,
production-style pipeline:

1. Capture audio with modern React Native APIs
2. Convert to strict model input format (mono, 16 kHz, float32 PCM)
3. Run fast on-device inference with TFLite
4. Aggregate window-level predictions into human-readable snoring events

## Tech stack

- React Native 0.84
- TypeScript
- react-native-fast-tflite (JSI-backed inference path)
- react-native-nitro-sound (Nitro architecture for audio recording)
- Native PCM converter module (`RNPCMConverter`)

## Project structure

```text
src/
	assets/
		yamnet.tflite
	constants/
		audio.ts
		model.ts
	ml/
		snoringAnalyzer.ts
	native/
		pcmConverter.ts
	permissions/
		requestMicrophonePermission.ts
	services/
		recorder.ts
```

## Audio AI pipeline

1. Record audio in app
2. Convert recorded file into PCM float32 mono 16 kHz
3. Read PCM in small windows (memory-friendly)
4. Run YAMNet inference per window
5. Detect snoring windows with thresholding
6. Merge nearby positives with cooldown logic to estimate event count

## Performance and memory best practices used

- Windowed processing instead of loading full audio into memory
- Fixed model window size for deterministic runtime
- Event-loop yielding during long analysis to keep UI responsive
- Minimal allocations in core scoring loop
- Native conversion for heavy audio format work

## How to run

### 1. Install dependencies

```bash
npm install
```

### 2. iOS setup

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### 3. Start Metro

```bash
npm start
```

### 4. Run Android

```bash
npm run android
```

### 5. Run iOS

```bash
npm run ios
```

## Native module notes

- Android PCM converter implementation is included in this repo.
- JavaScript calls `RNPCMConverter` for PCM conversion on both platforms.
- If your iOS app does not yet include `RNPCMConverter`, add the matching iOS
	module implementation before running inference flow on iOS devices.

## Model input contract

The model pipeline expects:

- Mono audio
- 16,000 Hz sample rate
- Float32 PCM waveform
- Windowed analysis based on YAMNet-compatible frame sizing

If these constraints are violated, prediction quality will drop.

## Public repo quality checklist

- Typed source code and linted project
- Platform permissions documented
- Third-party model notice included
- Deterministic preprocessing and threshold logic
- Readable module boundaries for review and onboarding

## Compliance and licensing

- Project license: [LICENSE](./LICENSE)
- Third-party attributions and model notice:
	[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)

If you replace model assets, update both attribution and file integrity records.

## SEO-friendly topics you can add in GitHub settings

Use repository topics for better discoverability:

- react-native
- react-native-ai
- tflite
- tensorflow-lite
- react-native-fast-tflite
- audio-processing
- sound-classification
- snoring-detection
- on-device-ml
- mobile-ai

## FAQ

### How to integrate model in React Native?

Use a TFLite runtime in React Native, define a strict preprocessing contract,
and isolate model invocation in a dedicated service layer.

### How to process audio in React Native by AI?

Record audio, normalize and convert to model-required PCM format, process in
small windows, then aggregate per-window predictions.

### How to detect snoring in React Native?

Use a sound event model (YAMNet or custom), calibrate snoring thresholds on
real data, and apply smoothing/cooldown to avoid over-counting continuous snore
segments.

## Disclaimer

This demo is for educational and product prototyping purposes and is not a
medical diagnosis tool.
