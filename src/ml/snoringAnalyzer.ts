import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
import {
  loadTensorflowModel,
  type TensorflowModel,
} from 'react-native-fast-tflite';
import {
  EVENT_COOLDOWN_WINDOWS,
  MODEL_WINDOW_BYTES,
  MODEL_WINDOW_SAMPLES,
  SNORING_CLASS_INDEXES,
  SNORING_SCORE_THRESHOLD,
} from '../constants/audio';
import { modelAsset } from '../constants/model';
import { convertToPCM } from '../native/pcmConverter';

export type AnalysisResult = {
  hasSnoring: boolean;
  snoringEvents: number;
  analyzedWindows: number;
  positiveWindows: number;
  maxSnoringScore: number;
};

let modelPromise: Promise<TensorflowModel> | null = null;

const getModel = async (): Promise<TensorflowModel> => {
  if (!modelPromise) {
    modelPromise = loadTensorflowModel(modelAsset.yamnet).catch(error => {
      const message = String(error);
      if (message.includes('undefined is not a function')) {
        throw new Error(
          'TensorFlow Lite native bindings are not available. On iOS, disable New Architecture for this app target and rebuild.',
        );
      }
      throw error;
    });
  }

  return modelPromise;
};

const base64ToFloat32 = (base64Chunk: string): Float32Array => {
  const binary = Buffer.from(base64Chunk, 'base64');
  const view = new DataView(
    binary.buffer,
    binary.byteOffset,
    binary.byteLength,
  );

  const floatCount = Math.floor(binary.byteLength / 4);
  const chunk = new Float32Array(MODEL_WINDOW_SAMPLES);

  for (let i = 0; i < floatCount && i < MODEL_WINDOW_SAMPLES; i += 1) {
    chunk[i] = view.getFloat32(i * 4, true);
  }

  return chunk;
};

const getSnoringScore = (scores: Float32Array): number => {
  let maxScore = 0;
  for (const classIndex of SNORING_CLASS_INDEXES) {
    if (scores[classIndex] > maxScore) {
      maxScore = scores[classIndex];
    }
  }

  return maxScore;
};

const buildOutputPCMPath = (): string => {
  const fileName = `snoring_${Date.now()}.pcm`;
  const basePath =
    RNFS.CachesDirectoryPath ||
    RNFS.TemporaryDirectoryPath ||
    RNFS.DocumentDirectoryPath;
  return `file://${basePath}/${fileName}`;
};

export const analyzeRecordedAudio = async (
  recordedFilePath: string,
): Promise<AnalysisResult> => {
  const model = await getModel();
  const pcmPath = await convertToPCM(recordedFilePath, buildOutputPCMPath());
  const stat = await RNFS.stat(pcmPath);

  const totalBytes = Number(stat.size);
  let position = 0;
  let positiveWindows = 0;
  let analyzedWindows = 0;
  let snoringEvents = 0;
  let cooldown = 0;
  let maxSnoringScore = 0;

  while (position < totalBytes) {
    const bytesToRead = Math.min(MODEL_WINDOW_BYTES, totalBytes - position);
    const base64Chunk = await RNFS.read(
      pcmPath,
      bytesToRead,
      position,
      'base64',
    );
    const inputTensor = base64ToFloat32(base64Chunk);

    const outputs = model.runSync([inputTensor]);
    const scores = outputs[0] as Float32Array;

    const score = getSnoringScore(scores);
    maxSnoringScore = Math.max(maxSnoringScore, score);

    const isSnoring = score >= SNORING_SCORE_THRESHOLD;
    if (isSnoring) {
      positiveWindows += 1;
      if (cooldown === 0) {
        snoringEvents += 1;
        cooldown = EVENT_COOLDOWN_WINDOWS;
      }
    }

    if (cooldown > 0) {
      cooldown -= 1;
    }

    analyzedWindows += 1;
    position += bytesToRead;

    // Yield to JS event loop for long files to keep UI responsive.
    if (analyzedWindows % 20 === 0) {
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 0);
      });
    }
  }

  return {
    hasSnoring: snoringEvents > 0,
    snoringEvents,
    analyzedWindows,
    positiveWindows,
    maxSnoringScore,
  };
};
