import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  requestMicrophonePermission,
  showMicrophoneSettingsAlert,
} from './src/permissions/requestMicrophonePermission';
import {
  addRecorderListener,
  startRecorder,
  stopRecorder,
} from './src/services/recorder';
import { analyzeRecordedAudio } from './src/ml/snoringAnalyzer';

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [lastResult, setLastResult] = useState<string>('No analysis yet');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const onStartRecording = async () => {
    if (isBusy || isRecording) {
      return;
    }

    setIsBusy(true);
    try {
      const allowed = await requestMicrophonePermission();
      if (!allowed) {
        return;
      }

      unsubscribeRef.current = addRecorderListener(setRecordMs);
      await startRecorder();
      setRecordMs(0);
      setLastResult('Recording in progress...');
      setIsRecording(true);
    } catch (error) {
      console.error('start recording failed', error);
      const message = String(error);
      if (
        message.includes('Failed to prepare recorder') ||
        message.includes('Recording setup failed')
      ) {
        Alert.alert(
          'Recorder Setup Failed',
          'This can happen on iOS Simulator. Please test recording on a real iPhone, or restart the app and try again.',
        );
      } else {
        showMicrophoneSettingsAlert();
      }
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    } finally {
      setIsBusy(false);
    }
  };

  const onStopRecording = async () => {
    if (isBusy || !isRecording) {
      return;
    }

    setIsBusy(true);
    try {
      const recordedPath = await stopRecorder();
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setIsRecording(false);

      const analysis = await analyzeRecordedAudio(recordedPath);
      const summary =
        `Snoring: ${analysis.hasSnoring ? 'Detected' : 'Not detected'}\n` +
        `Events: ${analysis.snoringEvents}\n` +
        `Windows analyzed: ${analysis.analyzedWindows}\n` +
        `Positive windows: ${analysis.positiveWindows}\n` +
        `Peak snoring score: ${analysis.maxSnoringScore.toFixed(2)}`;

      setLastResult(summary);
      Alert.alert('Analysis Complete', summary);
    } catch (error) {
      console.error('stop or analyze failed', error);
      const message = String(error);
      if (message.includes('TensorFlow Lite native bindings are not available')) {
        Alert.alert(
          'Model Runtime Not Ready',
          'TensorFlow Lite bindings are not initialized on iOS. Rebuild the iOS app after disabling New Architecture for this project.',
        );
      } else {
        Alert.alert('Error', 'Failed to analyze recording.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.container}>
          <Text style={styles.title}>Snoring Demo</Text>
          <Text style={styles.subtitle}>
            Record audio, convert to PCM, and run YAMNet snoring detection.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recording Time</Text>
            <Text style={styles.timer}>{formatDuration(recordMs)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              isRecording ? styles.buttonDanger : styles.buttonPrimary,
            ]}
            onPress={isRecording ? onStopRecording : onStartRecording}
            disabled={isBusy}
          >
            <Text style={styles.buttonText}>
              {isRecording ? 'Stop and Analyze' : 'Start Recording'}
            </Text>
          </TouchableOpacity>

          {isBusy ? <ActivityIndicator size="small" color="#0B84FF" /> : null}

          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Last Result</Text>
            <Text style={styles.resultText}>{lastResult}</Text>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0C1C2B',
  },
  subtitle: {
    marginTop: 8,
    color: '#425466',
    fontSize: 15,
    lineHeight: 20,
  },
  card: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  cardLabel: {
    fontSize: 14,
    color: '#61788E',
  },
  timer: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: '700',
    color: '#0C1C2B',
  },
  button: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0B84FF',
  },
  buttonDanger: {
    backgroundColor: '#D7263D',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resultBox: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0C1C2B',
  },
  resultText: {
    marginTop: 10,
    color: '#233649',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default App;
