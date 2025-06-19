import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Camera,
  useCameraPermission,
  useCameraDevices,
  CameraFormat,
  PhotoFile,
  CameraDevice,
} from 'react-native-vision-camera';

type CameraOutputTargets = {
  logicalCamera: CameraDevice;
  firstPhysicalCamera?: CameraDevice;
  secondPhysicalCamera?: CameraDevice;
};

const parseResolutionString = (res: string) => {
  const [width, height] = res.split('x').map(Number);
  return { width, height };
};

const predefinedResolutionsByRatio: { [key: string]: string[] } = {
  'Square (1:1)': [
    "720x720", "960x960", "1080x1080", "1200x1200", "1280x1280",
    "1440x1440", "1600x1600", "1920x1920", "2048x2048",
    "2160x2160", "2560x2560", "3000x3000", "3024x3024"
  ].sort((a, b) => {
    const resA = parseResolutionString(a);
    const resB = parseResolutionString(b);
    if (resA.width !== resB.width) return resA.width - resB.width;
    return resA.height - resB.height;
  }),

  '4x3 Landscape (4:3)': [
    "960x720", "1280x960", "1440x1080", "1600x1200",
    "2048x1536", "2448x1836", "2560x1920", "2880x2160", "3024x2268"
  ].sort((a, b) => {
    const resA = parseResolutionString(a);
    const resB = parseResolutionString(b);
    if (resA.width !== resB.width) return resA.width - resB.width;
    return resA.height - resB.height;
  }),

  '3x4 Portrait (3:4)': [
    "720x960", "960x1280", "1080x1440", "1200x1600",
    "1536x2048", "1836x2448", "1920x2560", "2160x2880",
    "2268x3024", "3000x4000", "3024x4032"
  ].sort((a, b) => {
    const resA = parseResolutionString(a);
    const resB = parseResolutionString(b);
    if (resA.width !== resB.width) return resA.width - resB.width;
    return resA.height - resB.height;
  }),

  '16x9 Landscape (16:9)': [
    "1280x720", "1600x900", "1920x1080", "2160x1215",
    "2560x1440", "3024x1701"
  ].sort((a, b) => {
    const resA = parseResolutionString(a);
    const resB = parseResolutionString(b);
    if (resA.width !== resB.width) return resA.width - resB.width;
    return resA.height - resB.height;
  }),

  '9x16 Portrait (9:16)': [
    "720x1280", "900x1600", "1080x1920", "1215x2160",
    "1440x2560", "1701x3024", "2160x3840", "2268x4032"
  ].sort((a, b) => {
    const resA = parseResolutionString(a);
    const resB = parseResolutionString(b);
    if (resA.width !== resB.width) return resA.width - resB.width;
    return resA.height - resB.height;
  })
};

const findBestFormatForResolution = (device: CameraDevice, targetResolution: { width: number; height: number }, targetAspectRatioKey: string): CameraFormat | undefined => {
  if (!device) return undefined;

  const targetAspectRatio = targetResolution.width / targetResolution.height;
  let bestFormat: CameraFormat | undefined = undefined;
  let maxScore = -1;

  for (const format of device.formats) {
    const formatAspectRatio = format.photoWidth / format.photoHeight;
    const aspectRatioScore = 1 / (1 + Math.abs(targetAspectRatio - formatAspectRatio)); 

    const resolutionDiff = Math.abs((format.photoWidth * format.photoHeight) - (targetResolution.width * targetResolution.height));
    const resolutionScore = (format.photoWidth >= targetResolution.width && format.photoHeight >= targetResolution.height)
      ? 1 / (1 + resolutionDiff / 100000)
      : 0;

    let fovScore = 1.0;
    if (device.physicalDevices.includes('wide-angle-camera') && (device.physicalDevices.includes('ultra-wide-angle-camera') || device.physicalDevices.includes('telephoto-camera'))) {
      if (format.fieldOfView >= 65 && format.fieldOfView <= 95) {
        fovScore = 1.5;
      } else {
        fovScore = 0.8;
      }
    }

    const totalScore = (aspectRatioScore * 2 + resolutionScore * 1.5) * fovScore;

    if (totalScore > maxScore) {
      maxScore = totalScore;
      bestFormat = format;
    }
  }

  return bestFormat;
};

const processPhoto = async (photo: PhotoFile, targetResolution: { width: number; height: number }) => {
  console.log('Starting post-processing for photo:', photo.path);
  console.log(`Original dimensions: ${photo.width}x${photo.height}`);
  console.log(`Target dimensions: ${targetResolution.width}x${targetResolution.height}`);

  if (photo.width < targetResolution.width || photo.height < targetResolution.height) {
    Alert.alert(
      'Processing Warning',
      `Cannot crop photo to ${targetResolution.width}x${targetResolution.height} because the original photo (${photo.width}x${photo.height}) is smaller. The original photo will be used.`
    );
    return photo.path;
  }

  try {
    Alert.alert(
      'Processing Complete (Simulated)',
      `Photo has been processed to ${targetResolution.width}x${targetResolution.height}.\n(This requires an image processing library to work for real)`
    );
    return photo.path;
  } catch (error) {
    console.error('Error during photo processing:', error);
    Alert.alert('Processing Error', 'Failed to process the photo.');
    return photo.path;
  }
};

function App(): React.JSX.Element {
  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices();

  const camera = useRef<Camera>(null);

  const [detectedCamerasInfo, setDetectedCamerasInfo] = useState<{ name: string; device: any; displayResolution: string; photoDisplayResolution: string; }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [showResolutionSelection, setShowResolutionSelection] = useState(false);

  const [currentCameraFormat, setCurrentCameraFormat] = useState<CameraFormat | undefined>(undefined);
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  
  const [selectedResolutionString, setSelectedResolutionString] = useState<string | null>(null);
  const [maxPhotoResolutionForDevice, setMaxPhotoResolutionForDevice] = useState<{ width: number, height: number } | null>(null);

  const backCamera = devices.find(d => d.position === 'back' && d.physicalDevices.includes('wide-angle-camera'));
  const frontCamera = devices.find(d => d.position === 'front' && d.physicalDevices.includes('wide-angle-camera'));

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (hasPermission && devices.length > 0) {
      const foundCameras: { name: string; device: any; displayResolution: string; photoDisplayResolution: string; }[] = [];

      devices.forEach(device => {
        let deviceName = device.name || device.id; 
        
        if (device.position === 'front') {
            if (device.physicalDevices.includes('ultra-wide-angle-camera')) {
                deviceName = 'Front Ultra Wide Camera';
            } else if (device.name.includes('TrueDepth') || device.id.includes('TrueDepth')) {
                deviceName = 'Front TrueDepth Camera';
            } else {
                deviceName = 'Front Camera';
            }
        } else if (device.position === 'back') {
            if (device.physicalDevices.includes('ultra-wide-angle-camera') && device.physicalDevices.includes('wide-angle-camera') && device.physicalDevices.includes('telephoto-camera')) {
                deviceName = 'Back Triple Camera';
            } else if (device.physicalDevices.includes('ultra-wide-angle-camera') && device.physicalDevices.includes('wide-angle-camera')) {
                deviceName = 'Back Dual Wide Camera';
            } else if (device.physicalDevices.includes('wide-angle-camera') && device.physicalDevices.includes('telephoto-camera')) {
                deviceName = 'Back Dual Camera';
            } else if (device.physicalDevices.includes('telephoto-camera')) {
                deviceName = 'Back Telephoto Camera';
            } else if (device.physicalDevices.includes('ultra-wide-angle-camera')) {
                deviceName = 'Back Ultra Wide Camera';
            } else {
                deviceName = 'Back Camera';
            }
        }

        const highestVideoResFormatForDisplay = device.formats
            .sort((a: CameraFormat, b: CameraFormat) => {
                const areaA = a.videoWidth * a.videoHeight;
                const areaB = b.videoWidth * b.videoHeight;
                if (areaA !== areaB) return areaB - areaA;
                return b.maxFrameRate - a.maxFrameRate;
            })[0];
        
        const videoDisplayResString = highestVideoResFormatForDisplay 
            ? `${highestVideoResFormatForDisplay.videoWidth}x${highestVideoResFormatForDisplay.videoHeight}` 
            : 'Unknown';

        const highestPhotoResFormatForDisplay = device.formats
            .filter((f: CameraFormat) => f.photoWidth && f.photoHeight)
            .sort((a: CameraFormat, b: CameraFormat) => {
                const areaA = (a.photoWidth || 0) * (a.photoHeight || 0);
                const areaB = (b.photoWidth || 0) * (b.photoHeight || 0);
                if (areaA !== areaB) return areaB - areaA;
                const videoAreaA = a.videoWidth * a.videoHeight;
                const videoAreaB = b.videoWidth * b.videoHeight;
                if (videoAreaA !== videoAreaB) return videoAreaB - videoAreaA;
                return (b.maxFrameRate || 0) - (a.maxFrameRate || 0);
            })[0];
        
        const photoDisplayResString = highestPhotoResFormatForDisplay
            ? `${highestPhotoResFormatForDisplay.photoWidth}x${highestPhotoResFormatForDisplay.photoHeight}`
            : 'N/A';

        foundCameras.push({ 
            name: deviceName, 
            device, 
            displayResolution: videoDisplayResString,
            photoDisplayResolution: photoDisplayResString
        });
      });

      const uniqueCameraInfo: { name: string; device: any; displayResolution: string; photoDisplayResolution: string; }[] = [];
      const seenDeviceIds = new Set<string>();

      foundCameras.forEach(info => {
        if (!seenDeviceIds.has(info.device.id)) {
          uniqueCameraInfo.push(info);
          seenDeviceIds.add(info.device.id);
        }
      });
      
      setDetectedCamerasInfo(uniqueCameraInfo);
      
      if (!selectedDevice) {
        const defaultDevice = backCamera || frontCamera || devices[0];
        setSelectedDevice(defaultDevice);
      }
    }
  }, [hasPermission, devices, selectedDevice, backCamera, frontCamera]);

  useEffect(() => {
    if (selectedDevice) {
        const highestResFormat = [...selectedDevice.formats]
            .filter((f: CameraFormat) => f.photoWidth && f.photoHeight)
            .sort((a: CameraFormat, b: CameraFormat) => (b.photoWidth * b.photoHeight) - (a.photoWidth * a.photoHeight))[0];

        if (highestResFormat) {
            setMaxPhotoResolutionForDevice({
                width: highestResFormat.photoWidth,
                height: highestResFormat.photoHeight,
            });
        } else {
            setMaxPhotoResolutionForDevice(null);
        }

      const highestPhotoFormat = selectedDevice.formats
          .filter((f: CameraFormat) => f.photoWidth && f.photoHeight)
          .sort((a: CameraFormat, b: CameraFormat) => {
              const areaA = (a.photoWidth || 0) * (a.photoHeight || 0);
              const areaB = (b.photoWidth || 0) * (b.photoHeight || 0);
              if (areaA !== areaB) return areaB - areaA;
              const videoAreaA = a.videoWidth * a.videoHeight;
              const videoAreaB = b.videoWidth * b.videoHeight;
              if (videoAreaA !== videoAreaB) return videoAreaB - videoAreaA;
              return (b.maxFrameRate || 0) - (a.maxFrameRate || 0);
          })[0];

      if (highestPhotoFormat) {
          setCurrentCameraFormat(highestPhotoFormat);
          setSelectedResolutionString(`${highestPhotoFormat.photoWidth}x${highestPhotoFormat.photoHeight}`);
      } else {
          setCurrentCameraFormat(undefined);
      }
      
      if (selectedDevice.physicalDevices.includes('ultra-wide-angle-camera') && 
          selectedDevice.physicalDevices.includes('wide-angle-camera') &&
          selectedDevice.position === 'back') {
            setCurrentZoom(selectedDevice.neutralZoom || 1);
      } else {
            setCurrentZoom(selectedDevice.neutralZoom || 1);
      }

    } else {
        setCurrentCameraFormat(undefined);
        setCurrentZoom(1);
        setMaxPhotoResolutionForDevice(null);
    }
  }, [selectedDevice]); 

  const onPressTakePhoto = useCallback(async () => {
    if (camera.current == null) {
      Alert.alert('Error', 'Camera is not ready!');
      return;
    }
    
    try {
      const photo: PhotoFile = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        skipMetadata: false,
      });
      
      Alert.alert(
        'Photo Taken!',
        `Path: ${photo.path}\nRaw Resolution: ${photo.width}x${photo.height}\nFileSize: ${Math.round(photo.size / 1024)}KB`
      );

      if (selectedResolutionString) {
        const targetResolution = parseResolutionString(selectedResolutionString);
        await processPhoto(photo, targetResolution);
      }

    } catch (e: any) {
      console.error('Failed to take photo!', e);
      Alert.alert('Error', `Failed to take photo: ${e.message}`);
    }
  }, [currentCameraFormat, selectedResolutionString]);

  const handleCameraSelect = useCallback((deviceToSelect: any) => {
    if (deviceToSelect) {
      setSelectedDevice(deviceToSelect);
      setCurrentCameraFormat(undefined);
      setSelectedResolutionString(null);
      Alert.alert("Select Camera", `Switched to: ${deviceToSelect.name || deviceToSelect.id} (${deviceToSelect.position === 'front' ? 'Front' : 'Back'})`);
      setShowDeviceList(false);
    } else {
      Alert.alert("Error", "Selected camera not found.");
    }
  }, []);

  const toggleDeviceList = useCallback(() => {
    setShowDeviceList(prev => !prev);
    setShowResolutionSelection(false);
  }, []);

  const toggleResolutionSelection = useCallback(() => {
    setShowResolutionSelection(prev => !prev);
    setShowDeviceList(false);
  }, []);

  const toggleCameraPosition = useCallback(() => {
    if (selectedDevice) {
      let newDevice = null;
      if (selectedDevice.position === 'back') {
        newDevice = devices.find(d => d.position === 'front');
      } else if (selectedDevice.position === 'front') {
        newDevice = devices.find(d => d.position === 'back');
      }

      if (newDevice) {
        setSelectedDevice(newDevice);
        setCurrentCameraFormat(undefined);
        setSelectedResolutionString(null);
        Alert.alert("Switch Camera", `Switched to: ${newDevice.position === 'front' ? 'Front' : 'Back'} Camera`);
      } else {
        Alert.alert("No Camera Found", `No ${selectedDevice.position === 'back' ? 'front' : 'back'} camera to switch to on this device.`);
      }
    }
  }, [selectedDevice, devices]);

  const getAvailableResolutionsForRatio = useCallback((ratioKey: string) => {
    if (!maxPhotoResolutionForDevice || !predefinedResolutionsByRatio[ratioKey]) {
      return [];
    }
  
    const maxDeviceDim = Math.max(maxPhotoResolutionForDevice.width, maxPhotoResolutionForDevice.height);
    const minDeviceDim = Math.min(maxPhotoResolutionForDevice.width, maxPhotoResolutionForDevice.height);
    const resolutionsForRatio = predefinedResolutionsByRatio[ratioKey];
    
    const available = resolutionsForRatio.filter(resStr => {
      const { width, height } = parseResolutionString(resStr);
      const maxOptionDim = Math.max(width, height);
      const minOptionDim = Math.min(width, height);
      return maxOptionDim <= maxDeviceDim && minOptionDim <= minDeviceDim;
    });
  
    return available;
  }, [maxPhotoResolutionForDevice]);

  const [selectedAspectRatioKey, setSelectedAspectRatioKey] = useState<string | null>(null);

  const handleResolutionSelect = useCallback((resolutionString: string, ratioKey: string) => {
    if (selectedDevice) {
      const targetResolution = parseResolutionString(resolutionString);
      
      const bestFormat = findBestFormatForResolution(selectedDevice, targetResolution, ratioKey);

      if (bestFormat) {
        setCurrentCameraFormat(bestFormat);
        setSelectedResolutionString(resolutionString);
        Alert.alert("Select Resolution", `Switched to: ${resolutionString}\n(Actual Format: ${bestFormat.photoWidth}x${bestFormat.photoHeight})`);
        setShowResolutionSelection(false);
      } else {
        Alert.alert("Error", "Could not find a suitable format for the selected resolution.");
      }
    }
  }, [selectedDevice]);
  
  if (!hasPermission) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>App does not have camera permission.</Text>
        </View>
    );
  }

  if (selectedDevice == null || currentCameraFormat === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Searching for camera devices and setting resolution...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedDevice && currentCameraFormat && !showDeviceList && !showResolutionSelection ? (
        <Camera 
          ref={camera}
          style={StyleSheet.absoluteFill} 
          device={selectedDevice} 
          format={currentCameraFormat} 
          isActive={true} 
          zoom={currentZoom}
          photo={true}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
            <Text style={styles.text}>Loading camera or selecting camera/resolution...</Text>
        </View>
      )}

      {!showDeviceList && !showResolutionSelection && selectedDevice && (
        <>
          <TouchableOpacity style={styles.settingsButton} onPress={toggleDeviceList}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cameraToggleButton} onPress={toggleCameraPosition}>
            <Text style={styles.cameraToggleButtonText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resolutionButton} onPress={toggleResolutionSelection}>
            <Text style={styles.resolutionButtonText}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.takePhotoButton} onPress={onPressTakePhoto}>
            <Text style={styles.takePhotoButtonText}></Text>
          </TouchableOpacity>
        </>
      )}

      {showDeviceList && (
        <View style={styles.deviceListContainer}>
          <View style={styles.deviceListHeader}>
            <TouchableOpacity onPress={toggleDeviceList} style={styles.backButton}>
              <Text style={styles.backButtonText}>{"< Back"}</Text>
            </TouchableOpacity>
            <Text style={styles.deviceListTitle}>Camera Devices</Text>
          </View>
          <Text style={styles.deviceListDescription}>
            These are all detected Camera devices on your phone. This list will
            automatically update as you plug devices in or out.
          </Text>

          <ScrollView style={styles.cameraListScrollView}>
            {detectedCamerasInfo.length > 0 ? (
              detectedCamerasInfo.map((cameraInfo) => (
                <TouchableOpacity
                  key={cameraInfo.device.id}
                  style={[styles.cameraButton, selectedDevice && selectedDevice.id === cameraInfo.device.id && styles.selectedCameraButton]}
                  onPress={() => handleCameraSelect(cameraInfo.device)}
                >
                  <Text style={styles.cameraButtonLabel}>{cameraInfo.name}</Text>
                  <Text style={styles.cameraButtonDetails}>
                    Physical Devices: {cameraInfo.device.physicalDevices.join(', ')}
                  </Text>
                  <Text style={styles.cameraButtonDetails}>
                      Video Resolution: {cameraInfo.displayResolution}
                  </Text>
                  <Text style={styles.cameraButtonDetails}>
                      Photo Resolution: {cameraInfo.photoDisplayResolution}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.text}>No specific camera types found.</Text>
            )}
          </ScrollView>
        </View>
      )}

      {showResolutionSelection && (
        <View style={styles.deviceListContainer}>
          <View style={styles.deviceListHeader}>
            <TouchableOpacity onPress={toggleResolutionSelection} style={styles.backButton}>
              <Text style={styles.backButtonText}>{"< Camera"}</Text>
            </TouchableOpacity>
            <Text style={styles.deviceListTitle}>Resolution Selection</Text>
          </View>
          <Text style={styles.deviceListDescription}>
            Select the Aspect Ratio and Photo Resolution supported by the current camera.
            {"\n"}Current Camera: {selectedDevice?.name || selectedDevice?.id} ({selectedDevice?.position === 'front' ? 'Front' : 'Back'})
            {"\n"}Device Max Res: {maxPhotoResolutionForDevice ? `${maxPhotoResolutionForDevice.width}x${maxPhotoResolutionForDevice.height}` : 'N/A'}
            {"\n"}User-Selected Res: {selectedResolutionString || 'Default'}
            {"\n"}Actual Format Res: {currentCameraFormat?.photoWidth}x{currentCameraFormat?.photoHeight}
            {"\n"}Current Zoom: {currentZoom.toFixed(2)}x
          </Text>

          <ScrollView style={styles.cameraListScrollView}>
            <Text style={styles.sectionTitle}>Select Aspect Ratio (Photo):</Text>
            {Object.keys(predefinedResolutionsByRatio).map((ratioKey) => (
              <TouchableOpacity
                key={ratioKey}
                style={[styles.cameraButton, selectedAspectRatioKey === ratioKey && styles.selectedCameraButton]}
                onPress={() => setSelectedAspectRatioKey(ratioKey)}
              >
                <Text style={styles.cameraButtonText}>{ratioKey}</Text>
              </TouchableOpacity>
            ))}

            {selectedAspectRatioKey && (
              <>
                <Text style={styles.sectionTitle}>Select Photo Resolution ({selectedAspectRatioKey}):</Text>
                {getAvailableResolutionsForRatio(selectedAspectRatioKey).length > 0 ? (
                  getAvailableResolutionsForRatio(selectedAspectRatioKey).map((resStr) => (
                    <TouchableOpacity
                      key={resStr}
                      style={[
                        styles.cameraButton,
                        selectedResolutionString === resStr && styles.selectedCameraButton
                      ]}
                      onPress={() => handleResolutionSelect(resStr, selectedAspectRatioKey)}
                    >
                      <Text style={styles.cameraButtonText}>{resStr}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.cameraText}>No supported Photo Resolutions found for this Aspect Ratio.</Text>
                )}
                <Text style={styles.textWarning}>
                  Note: The actual capture format may have a higher resolution and will be cropped if necessary.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    loadingOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    text: {
        color: 'white',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 10,
    },
    cameraText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 15,
    },
    textWarning: {
      color: 'yellow',
      fontSize: 14,
      marginTop: 10,
      paddingHorizontal: 5,
    },
    settingsButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    settingsButtonText: {
        fontSize: 24,
        color: 'white',
    },
    cameraToggleButton: {
        position: 'absolute',
        top: 110,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    cameraToggleButtonText: {
        fontSize: 24,
        color: 'white',
    },
    resolutionButton: {
        position: 'absolute',
        top: 170,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    resolutionButtonText: {
        fontSize: 24,
        color: 'white',
    },
    takePhotoButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#FF0000',
        borderRadius: 35,
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 4,
        borderColor: 'white',
    },
    takePhotoButtonText: {
        fontSize: 36,
        color: 'white',
    },
    deviceListContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        paddingTop: 50,
    },
    deviceListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    backButton: {
        marginRight: 10,
        padding: 5,
    },
    backButtonText: {
        color: '#007bff',
        fontSize: 18,
    },
    deviceListTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
    },
    deviceListDescription: {
        color: 'lightgray',
        fontSize: 14,
        paddingHorizontal: 15,
        marginBottom: 20,
        lineHeight: 20,
    },
    cameraListScrollView: {
        flex: 1,
        paddingHorizontal: 15,
    },
    cameraButton: {
        backgroundColor: '#1c1c1e',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    selectedCameraButton: {
        backgroundColor: '#007bff',
    },
    cameraButtonText: {
        color: 'white',
        fontSize: 16,
    },
    cameraButtonLabel: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cameraButtonDetails: {
        color: 'lightgray',
        fontSize: 14,
        marginTop: 2,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        paddingLeft: 5,
    },
});

export default App;