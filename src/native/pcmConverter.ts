import { NativeModules, Platform } from 'react-native';

type RNPCMConverterModule = {
  convertToPCM(inputPath: string, outputPath: string): Promise<string>;
};

const { RNPCMConverter } = NativeModules as {
  RNPCMConverter?: RNPCMConverterModule;
};

const sanitizePath = (path: string): string =>
  path.startsWith('file://') ? path.replace('file://', '') : path;

export const convertToPCM = async (
  inputPath: string,
  outputPath: string,
): Promise<string> => {
  if (!RNPCMConverter?.convertToPCM) {
    const platformMessage =
      Platform.OS === 'android'
        ? 'RNPCMConverter Android module is not linked.'
        : 'RNPCMConverter iOS module is not linked.';
    throw new Error(platformMessage);
  }

  const convertedPath = await RNPCMConverter.convertToPCM(
    sanitizePath(inputPath),
    sanitizePath(outputPath),
  );

  return convertedPath.startsWith('file://')
    ? convertedPath
    : `file://${convertedPath}`;
};
