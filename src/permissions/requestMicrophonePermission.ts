import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission Needed',
        message: 'Please allow microphone access to record audio.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // iOS permission is requested by the native recorder on first use.
  // Keeping this path avoids a crash when RNPermissions handlers are not linked.
  return true;
};

export const showMicrophoneSettingsAlert = (): void => {
  Alert.alert(
    'Microphone Permission Needed',
    'Please enable microphone access from Settings to record audio.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
};
