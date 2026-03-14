/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: { MICROPHONE: 'ios.permission.MICROPHONE' },
    ANDROID: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
  },
  RESULTS: {
    GRANTED: 'granted',
    LIMITED: 'limited',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
  check: jest.fn(async () => 'granted'),
  request: jest.fn(async () => 'granted'),
}));

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    startRecorder: jest.fn(async () => 'file:///tmp/demo.m4a'),
    stopRecorder: jest.fn(async () => 'file:///tmp/demo.m4a'),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
  },
  AudioEncoderAndroidType: { AAC: 'aac' },
  AudioSourceAndroidType: { MIC: 'mic' },
  AVEncoderAudioQualityIOSType: { high: 'high' },
  AVEncodingOption: { aac: 'aac' },
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  TemporaryDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
  stat: jest.fn(async () => ({ size: 0 })),
  read: jest.fn(async () => ''),
}));

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn(async () => ({
    runSync: jest.fn(() => [new Float32Array(521)]),
  })),
}));

jest.mock('../src/constants/model', () => ({
  modelAsset: {
    yamnet: 'yamnet.tflite',
  },
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
