import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  type AudioSet,
} from 'react-native-nitro-sound';
import { TARGET_CHANNELS, TARGET_SAMPLE_RATE } from '../constants/audio';

const audioSet: AudioSet = {
  AudioSamplingRate: TARGET_SAMPLE_RATE,
  AudioChannels: TARGET_CHANNELS,
  AudioEncodingBitRate: 128000,
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  AVSampleRateKeyIOS: TARGET_SAMPLE_RATE,
  AVNumberOfChannelsKeyIOS: TARGET_CHANNELS,
  AVFormatIDKeyIOS: 'aac',
  AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
  AVModeIOS: 'measurement',
};

export const startRecorder = async (): Promise<string> => {
  return Sound.startRecorder(undefined, audioSet, false);
};

export const stopRecorder = async (): Promise<string> => {
  return Sound.stopRecorder();
};

export const addRecorderListener = (
  cb: (currentPositionMs: number) => void,
): (() => void) => {
  Sound.addRecordBackListener(event => {
    cb(event.currentPosition);
  });

  return () => {
    Sound.removeRecordBackListener();
  };
};
