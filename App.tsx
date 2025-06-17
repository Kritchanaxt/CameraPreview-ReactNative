import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

function App(): React.JSX.Element {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>ไม่พบอุปกรณ์กล้อง</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>แอปไม่ได้รับอนุญาตให้ใช้กล้อง</Text>
        </View>
    );
  }

  return (
    <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    text: {
        color: 'white',
        fontSize: 18,
    }
});

export default App;