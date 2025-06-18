import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Camera,
  useCameraPermission,
  useCameraDevices,
  CameraFormat,
  PhotoFile,
  CameraDevice, // Import CameraDevice for type definition
} from 'react-native-vision-camera';


// Helper type definition that encapsulates 3 sets of output targets:
// Logical camera, First physical camera, Second physical camera.
// This is a conceptual type to help clarify the intent of multi-camera setups.
// Note: VisionCamera's CameraDevice already contains physicalDevices which serve a similar purpose.
type CameraOutputTargets = {
  logicalCamera: CameraDevice;
  firstPhysicalCamera?: CameraDevice; // e.g., wide-angle
  secondPhysicalCamera?: CameraDevice; // e.g., ultra-wide or telephoto
};

const parseResolutionString = (res: string) => {
  const [width, height] = res.split('x').map(Number);
  return { width, height };
};

const predefinedResolutionsByRatio: { [key: string]: string[] } = {
  'Square (1:1)': [
    "720x720", "960x960", "1080x1080", "1200x1200", "1280x1280",
    "1440x1440", "1600x1600", "1920x1920", "2048x2048",
    "2160x2160", "2560x2560", "3024x3024"
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
    "2268x3024", "3024x4032"
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
  }, [hasPermission, devices, selectedDevice]);

  useEffect(() => {
    if (selectedDevice) {
      // IMPORTANT: Check this log in your console!
      // This will show you what resolutions VisionCamera reports for selectedDevice.formats.
      console.log("Formats available for selected device:", selectedDevice.formats);
      console.log("Selected device info:", selectedDevice);

      const defaultVideoFormat = selectedDevice.formats
          .sort((a: CameraFormat, b: CameraFormat) => {
              const areaA = a.videoWidth * a.videoHeight;
              const areaB = b.videoWidth * b.videoHeight;
              if (areaA !== areaB) return areaB - areaA;
              return b.maxFrameRate - a.maxFrameRate;
          })[0];
      
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

      if (defaultVideoFormat) {
          setCurrentCameraFormat(defaultVideoFormat);
          console.log("Setting default video format for preview to:", defaultVideoFormat.videoWidth, "x", defaultVideoFormat.videoHeight, "@", defaultVideoFormat.maxFrameRate);
      } else {
          console.error("No video formats available for selected device.");
          setCurrentCameraFormat(undefined);
      }

      if (highestPhotoFormat && highestPhotoFormat.photoWidth && highestPhotoFormat.photoHeight) {
          console.log("Highest Photo Resolution available:", highestPhotoFormat.photoWidth, "x", highestPhotoFormat.photoHeight);
      } else {
          console.log("No specific photo resolution found or supported for highest quality.");
      }

      // Logic to control zoom for multi-cameras (e.g., Back Dual Wide)
      // FIX: Changed zoom for 'Back Dual Wide Camera' to neutralZoom for wide-angle view,
      // instead of minZoom which typically gives ultra-wide.
      if (selectedDevice.physicalDevices.includes('ultra-wide-angle-camera') && 
          selectedDevice.physicalDevices.includes('wide-angle-camera') &&
          selectedDevice.position === 'back') {
            console.log("Setting zoom to neutralZoom for Back Dual Wide Camera (Wide view). minZoom is ultra-wide.");
            setCurrentZoom(selectedDevice.neutralZoom || 1);
      } else {
            setCurrentZoom(selectedDevice.neutralZoom || 1);
      }

    } else {
        setCurrentCameraFormat(undefined);
        setCurrentZoom(1);
    }
  }, [selectedDevice]); 

  const onPressTakePhoto = useCallback(async () => {
    if (camera.current == null) {
      Alert.alert('Error', 'Camera is not ready!');
      return;
    }
    
    try {
      console.log('Attempting to take photo...');
      const photo: PhotoFile = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        skipMetadata: false,
      });
      console.log('Photo taken!', photo);
      Alert.alert(
        'Photo Taken!',
        `Path: ${photo.path}\nResolution: ${photo.width}x${photo.height}\nFileSize: ${Math.round(photo.size / 1024)}KB`
      );

    } catch (e) {
      console.error('Failed to take photo!', e);
      Alert.alert('Error', `Failed to take photo: ${e.message}`);
    }
  }, []);

  const handleCameraSelect = useCallback((deviceToSelect: any) => {
    if (deviceToSelect) {
      setSelectedDevice(deviceToSelect);
      setCurrentCameraFormat(undefined);
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
        Alert.alert("Switch Camera", `Switched to: ${newDevice.position === 'front' ? 'Front' : 'Back'} Camera`);
      } else {
        Alert.alert("No Camera Found", `No ${selectedDevice.position === 'back' ? 'front' : 'back'} camera to switch to on this device.`);
      }
    }
  }, [selectedDevice, devices]);

  const getSupportedResolutionsForRatio = useCallback((ratioKey: string) => {
    if (!selectedDevice || !predefinedResolutionsByRatio[ratioKey]) {
      return [];
    }

    const availableFormats = selectedDevice.formats;
    const resolutionsForRatio = predefinedResolutionsByRatio[ratioKey];
    
    const supported: string[] = [];

    resolutionsForRatio.forEach(resStr => {
      const { width, height } = parseResolutionString(resStr);

      const isSupported = availableFormats.some((f: CameraFormat) => 
        f.videoWidth === width && f.videoHeight === height
      );
      if (isSupported) {
        supported.push(resStr);
      }
    });

    return supported;
  }, [selectedDevice]);

  const [selectedAspectRatioKey, setSelectedAspectRatioKey] = useState<string | null>(null);

  const handleResolutionSelect = useCallback((resolutionString: string) => {
    if (selectedDevice) {
      const { width, height } = parseResolutionString(resolutionString);
      const formatToApply = selectedDevice.formats.find(
        (f: CameraFormat) => f.videoWidth === width && f.videoHeight === height
      );

      if (formatToApply) {
        setCurrentCameraFormat(formatToApply);
        Alert.alert("Select Resolution", `Switched to: ${resolutionString}`);
        setShowResolutionSelection(false);
      } else {
        Alert.alert("Error", "No supported format found for this resolution.");
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
            Select the Aspect Ratio and Resolution supported by the current camera.
            {"\n"}Current Camera: {selectedDevice?.name || selectedDevice?.id} ({selectedDevice?.position === 'front' ? 'Front' : 'Back'})
            {"\n"}Current Video Resolution: {currentCameraFormat?.videoWidth}x{currentCameraFormat?.videoHeight}
            {"\n"}Current Zoom: {currentZoom.toFixed(2)}x
          </Text>

          <ScrollView style={styles.cameraListScrollView}>
            <Text style={styles.sectionTitle}>Select Aspect Ratio (Video/Preview):</Text>
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
                <Text style={styles.sectionTitle}>Select Video Resolution ({selectedAspectRatioKey}):</Text>
                {getSupportedResolutionsForRatio(selectedAspectRatioKey).length > 0 ? (
                  getSupportedResolutionsForRatio(selectedAspectRatioKey).map((resStr) => (
                    <TouchableOpacity
                      key={resStr}
                      style={[
                        styles.cameraButton,
                        currentCameraFormat && 
                        currentCameraFormat.videoWidth === parseResolutionString(resStr).width && 
                        currentCameraFormat.videoHeight === parseResolutionString(resStr).height && 
                        styles.selectedCameraButton
                      ]}
                      onPress={() => handleResolutionSelect(resStr)}
                    >
                      <Text style={styles.cameraButtonText}>{resStr}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.cameraText}>No supported Video Resolutions found for this Aspect Ratio.</Text>
                )}
                <Text style={styles.textWarning}>
                  Note: Resolution selection here affects Video Preview.
                  Photo Resolution may differ and is determined by Take Photo.
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
    textWarning: {
      color: 'yellow',
      fontSize: 14,
      marginTop: 2,
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