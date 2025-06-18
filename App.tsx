import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Camera,
  useCameraPermission,
  useCameraDevices,
  CameraFormat, // Import CameraFormat type
} from 'react-native-vision-camera';

// Helper function to parse resolution string "WxH" to {width, height}
const parseResolutionString = (res: string) => {
  const [width, height] = res.split('x').map(Number);
  return { width, height };
};

// Predefined resolutions by aspect ratio (translated from Swift to TypeScript)
const predefinedResolutionsByRatio: { [key: string]: string[] } = {
  'Square (1:1)': [
    "720x720", "960x960", "1080x1080", "1200x1200", "1280x1280",
    "1440x1440", "1600x1600", "1920x1920", "2048x2048",
    "2160x2160", "2560x2560", "3024x3024"
  ].sort((a, b) => { // Sort numerically by width, then height
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

// Main App component
function App(): React.JSX.Element {
  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices(); // Get all available camera devices

  const [detectedCamerasInfo, setDetectedCamerasInfo] = useState<{ name: string; device: any }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showDeviceList, setShowDeviceList] = useState(false); // State to control visibility of device list
  const [showResolutionSelection, setShowResolutionSelection] = useState(false); // New state for resolution selection modal

  // New state to hold the currently selected camera format for the Camera component
  const [currentCameraFormat, setCurrentCameraFormat] = useState<CameraFormat | undefined>(undefined);

  // Find front and back devices efficiently
  const backCamera = devices.find(d => d.position === 'back' && d.physicalDevices.includes('wide-angle-camera'));
  const frontCamera = devices.find(d => d.position === 'front' && d.physicalDevices.includes('wide-angle-camera'));

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Effect to detect cameras and set default device/format
  useEffect(() => {
    if (hasPermission && devices.length > 0) {
      const foundCameras: { name: string; device: any }[] = [];

      devices.forEach(device => {
        let deviceName = device.name || device.id; 
        
        // Assign user-friendly names based on device properties
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
        foundCameras.push({ name: deviceName, device });
      });

      // Filter out exact duplicates based on device ID
      const uniqueCameraInfo: { name: string; device: any }[] = [];
      const seenDeviceIds = new Set<string>();

      foundCameras.forEach(info => {
        if (!seenDeviceIds.has(info.device.id)) {
          uniqueCameraInfo.push(info);
          seenDeviceIds.add(info.device.id);
        }
      });
      
      setDetectedCamerasInfo(uniqueCameraInfo);
      
      // Set a default selected device (e.g., a back wide-angle camera)
      if (!selectedDevice) {
        const defaultDevice = backCamera || frontCamera || devices[0];
        setSelectedDevice(defaultDevice);
      }
    }
  }, [hasPermission, devices]);

  // Effect to set default format when selectedDevice changes
  useEffect(() => {
    if (selectedDevice && !currentCameraFormat) {
        // Find the highest resolution format for the selectedDevice that is <= 2160x2160
        const defaultFormat = selectedDevice.formats
            .filter((f: CameraFormat) => f.videoWidth <= 2160 && f.videoHeight <= 2160)
            .sort((a: CameraFormat, b: CameraFormat) => {
                // Sort by resolution area descending, then by frame rate descending
                const areaA = a.videoWidth * a.videoHeight;
                const areaB = b.videoWidth * b.videoHeight;
                if (areaA !== areaB) return areaB - areaA;
                return b.maxFrameRate - a.maxFrameRate;
            })[0]; // Pick the first (highest resolution)
        
        if (defaultFormat) {
            setCurrentCameraFormat(defaultFormat);
            console.log("Setting default format:", defaultFormat.videoWidth, "x", defaultFormat.videoHeight, "@", defaultFormat.maxFrameRate);
        } else {
            console.warn("No suitable default format found for the selected device.");
        }
    } else if (!selectedDevice && currentCameraFormat) {
        // Clear format if no device is selected
        setCurrentCameraFormat(undefined);
    }
  }, [selectedDevice, currentCameraFormat]);


  // Function to handle camera selection from the list
  const handleCameraSelect = useCallback((deviceToSelect: any) => {
    if (deviceToSelect) {
      setSelectedDevice(deviceToSelect);
      // Reset format when device changes, so useEffect can pick a new default
      setCurrentCameraFormat(undefined); 
      Alert.alert("เลือกกล้อง", `สลับไปใช้: ${deviceToSelect.name || deviceToSelect.id} (${deviceToSelect.position === 'front' ? 'หน้า' : 'หลัง'})`);
      setShowDeviceList(false); // Close the device list after selection
    } else {
      Alert.alert("ข้อผิดพลาด", "ไม่พบกล้องที่เลือก");
    }
  }, []);

  // Toggle visibility of the device list
  const toggleDeviceList = useCallback(() => {
    setShowDeviceList(prev => !prev);
    setShowResolutionSelection(false); // Close resolution selection if open
  }, []);

  // Toggle visibility of the resolution selection list
  const toggleResolutionSelection = useCallback(() => {
    setShowResolutionSelection(prev => !prev);
    setShowDeviceList(false); // Close device list if open
  }, []);

  // Function to toggle between front and back camera positions
  const toggleCameraPosition = useCallback(() => {
    if (selectedDevice) {
      let newDevice = null;
      if (selectedDevice.position === 'back') {
        // Try to find any front camera
        newDevice = devices.find(d => d.position === 'front');
      } else if (selectedDevice.position === 'front') {
        // Try to find any back camera
        newDevice = devices.find(d => d.position === 'back');
      }

      if (newDevice) {
        setSelectedDevice(newDevice);
        setCurrentCameraFormat(undefined); // Reset format for new device
        Alert.alert("สลับกล้อง", `สลับไปใช้กล้อง: ${newDevice.position === 'front' ? 'หน้า' : 'หลัง'}`);
      } else {
        // More specific message:
        Alert.alert("ไม่พบกล้อง", `ไม่พบกล้อง${selectedDevice.position === 'back' ? 'หน้า' : 'หลัง'}ที่จะสลับบนอุปกรณ์นี้`);
      }
    }
  }, [selectedDevice, devices]); // Make sure 'devices' is in the dependency array

  // Function to filter and return supported resolutions for a given aspect ratio
  const getSupportedResolutionsForRatio = useCallback((ratioKey: string) => {
    if (!selectedDevice || !predefinedResolutionsByRatio[ratioKey]) {
      return [];
    }

    const availableFormats = selectedDevice.formats;
    const resolutionsForRatio = predefinedResolutionsByRatio[ratioKey];
    
    const supported: string[] = [];
    const maxAllowedWidth = 2160;
    const maxAllowedHeight = 2160;

    resolutionsForRatio.forEach(resStr => {
      const { width, height } = parseResolutionString(resStr);

      // Apply the 2160x2160 limit
      if (width > maxAllowedWidth || height > maxAllowedHeight) {
        return; // Skip resolutions exceeding the limit
      }

      // Check if the device's formats include this resolution
      const isSupported = availableFormats.some((f: CameraFormat) => 
        f.videoWidth === width && f.videoHeight === height
      );
      if (isSupported) {
        supported.push(resStr);
      }
    });

    return supported;
  }, [selectedDevice]);

  // State to keep track of the selected aspect ratio in the resolution modal
  const [selectedAspectRatioKey, setSelectedAspectRatioKey] = useState<string | null>(null);

  // Handle resolution selection from the list
  const handleResolutionSelect = useCallback((resolutionString: string) => {
    if (selectedDevice) {
      const { width, height } = parseResolutionString(resolutionString);
      // Find the actual CameraFormat object that matches the selected resolution
      const formatToApply = selectedDevice.formats.find(
        (f: CameraFormat) => f.videoWidth === width && f.videoHeight === height
      );

      if (formatToApply) {
        setCurrentCameraFormat(formatToApply);
        Alert.alert("เลือก Resolution", `สลับไปใช้: ${resolutionString}`);
        setShowResolutionSelection(false); // Close modal
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่พบ Format ที่รองรับสำหรับ Resolution นี้");
      }
    }
  }, [selectedDevice]);


  if (!hasPermission) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>แอปไม่ได้รับอนุญาตให้ใช้กล้อง</Text>
        </View>
    );
  }

  // Display initial loading or no device state
  if (selectedDevice == null || currentCameraFormat === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>กำลังค้นหาอุปกรณ์กล้องและตั้งค่า Resolution...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedDevice && currentCameraFormat && !showDeviceList && !showResolutionSelection ? (
        <Camera style={StyleSheet.absoluteFill} device={selectedDevice} format={currentCameraFormat} isActive={true} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
            <Text style={styles.text}>กำลังโหลดกล้อง หรือกำลังเลือกกล้อง/Resolution...</Text>
        </View>
      )}

      {/* Overlay for buttons on main camera view */}
      {!showDeviceList && !showResolutionSelection && selectedDevice && (
        <>
          {/* Settings Button */}
          <TouchableOpacity style={styles.settingsButton} onPress={toggleDeviceList}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>

          {/* Camera Toggle Button (moved to right, below settings) */}
          <TouchableOpacity style={styles.cameraToggleButton} onPress={toggleCameraPosition}>
            <Text style={styles.cameraToggleButtonText}>🔄</Text>
          </TouchableOpacity>

          {/* Resolution Selection Button (below camera toggle) */}
          <TouchableOpacity style={styles.resolutionButton} onPress={toggleResolutionSelection}>
            <Text style={styles.resolutionButtonText}>🖼️</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Camera Devices List Modal/View */}
      {showDeviceList && (
        <View style={styles.deviceListContainer}>
          <View style={styles.deviceListHeader}>
            <TouchableOpacity onPress={toggleDeviceList} style={styles.backButton}>
              <Text style={styles.backButtonText}>{"< Camera"}</Text>
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
                    {cameraInfo.device.position === 'front' ? 'หน้า' : 'หลัง'} {cameraInfo.device.physicalDevices.join(', ')}
                  </Text>
                  <Text style={styles.cameraButtonDetails}>
                    📸 {cameraInfo.device.minZoom}x-{cameraInfo.device.maxZoom}x
                  </Text>
                  <Text style={styles.cameraButtonDetails}>
                    {cameraInfo.device.formats[0]?.videoWidth}x{cameraInfo.device.formats[0]?.videoHeight} @ {cameraInfo.device.formats[0]?.maxFrameRate} FPS
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.text}>ไม่พบกล้องเฉพาะประเภท</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Resolution Selection Modal/View */}
      {showResolutionSelection && (
        <View style={styles.deviceListContainer}> {/* Reusing deviceListContainer styles for consistency */}
          <View style={styles.deviceListHeader}>
            <TouchableOpacity onPress={toggleResolutionSelection} style={styles.backButton}>
              <Text style={styles.backButtonText}>{"< Camera"}</Text>
            </TouchableOpacity>
            <Text style={styles.deviceListTitle}>Resolution Selection</Text>
          </View>
          <Text style={styles.deviceListDescription}>
            เลือก Aspect Ratio และ Resolution ที่รองรับโดยกล้องปัจจุบัน (สูงสุด 2160x2160).
            {"\n"}กล้องปัจจุบัน: {selectedDevice?.name || selectedDevice?.id} ({selectedDevice?.position === 'front' ? 'หน้า' : 'หลัง'})
            {"\n"}Resolution ปัจจุบัน: {currentCameraFormat?.videoWidth}x{currentCameraFormat?.videoHeight}
          </Text>

          <ScrollView style={styles.cameraListScrollView}>
            {/* Aspect Ratio Selection */}
            <Text style={styles.sectionTitle}>เลือก Aspect Ratio:</Text>
            {Object.keys(predefinedResolutionsByRatio).map((ratioKey) => (
              <TouchableOpacity
                key={ratioKey}
                style={[styles.cameraButton, selectedAspectRatioKey === ratioKey && styles.selectedCameraButton]}
                onPress={() => setSelectedAspectRatioKey(ratioKey)}
              >
                <Text style={styles.cameraButtonText}>{ratioKey}</Text>
              </TouchableOpacity>
            ))}

            {/* Resolutions for Selected Aspect Ratio */}
            {selectedAspectRatioKey && (
              <>
                <Text style={styles.sectionTitle}>เลือก Resolution ({selectedAspectRatioKey}):</Text>
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
                  <Text style={styles.cameraText}>ไม่พบ Resolution ที่รองรับสำหรับ Aspect Ratio นี้ (สูงสุด 2160x2160)</Text>
                )}
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
    // Styles for Settings Button (Top Right)
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
    // Styles for Camera Toggle Button (Right, below settings button)
    cameraToggleButton: {
        position: 'absolute',
        top: 110, // Adjusted top to be below settingsButton (50 + 50 + 10 padding = 110)
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
    // Styles for Resolution Selection Button (Right, below camera toggle button)
    resolutionButton: {
        position: 'absolute',
        top: 170, // Adjusted top to be below cameraToggleButton (110 + 50 + 10 = 170)
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

    // Styles for Device List Container (Modal/Screen)
    deviceListContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        paddingTop: 50, // To avoid status bar
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
        color: '#007bff', // iOS blue
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
        backgroundColor: '#1c1c1e', // Dark background for buttons
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    selectedCameraButton: {
        backgroundColor: '#007bff', // Highlight color for selected button
    },
    cameraButtonText: { // Generic text style for buttons in modals
        color: 'white',
        fontSize: 16,
    },
    cameraButtonLabel: { // Specific text style for camera device labels
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