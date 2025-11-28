# 📷 VisionCameraApp - React Native Camera Preview

A React Native application demonstrating advanced camera functionality using [react-native-vision-camera](https://react-native-vision-camera.com/). This app provides a comprehensive camera experience with support for multiple camera devices, various aspect ratios, and high-resolution photo capture.

![React Native](https://img.shields.io/badge/React_Native-0.80.0-blue)
![Vision Camera](https://img.shields.io/badge/Vision_Camera-4.7.0-green)
![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey)


---

## 📱 Download APK

> **[Download APK for Android](./app-release.apk)**

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Digital Ink & OCR Integration](#-digital-ink--ocr-integration)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

- **📸 Multi-Camera Support**: Access front, back, wide-angle, ultra-wide-angle, and telephoto cameras
- **🖼️ Multiple Aspect Ratios**: Support for 1:1, 4:3, 3:4, 16:9, and 9:16 ratios
- **📏 Custom Resolutions**: Select from various predefined resolutions based on device capabilities
- **🔄 Camera Switching**: Seamlessly switch between front and back cameras
- **📷 High-Quality Photo Capture**: Take photos with quality prioritization
- **⚙️ Camera Settings UI**: User-friendly interface for camera and resolution selection
- **🔍 Auto Format Selection**: Automatically selects the best camera format for target resolution

---

## 📁 Project Structure

```
CameraPreview-ReactNative/
├── App.tsx                    # Main application component with camera logic
├── index.js                   # Entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
├── metro.config.js            # Metro bundler configuration
├── jest.config.js             # Jest testing configuration
├── app.json                   # App configuration
├── __tests__/                 # Test files
│   └── App.test.tsx           # Main app tests
├── android/                   # Android native code
│   ├── app/
│   │   ├── build.gradle       # Android app build configuration
│   │   └── src/
│   │       └── main/
│   │           ├── AndroidManifest.xml  # Android permissions & config
│   │           └── java/com/visioncameraapp/
│   │               ├── MainActivity.kt
│   │               └── MainApplication.kt
│   ├── build.gradle           # Root build configuration
│   └── settings.gradle        # Gradle settings
├── ios/                       # iOS native code
│   ├── Podfile                # CocoaPods dependencies
│   ├── VisionCameraApp/
│   │   ├── AppDelegate.swift  # iOS app delegate
│   │   ├── Info.plist         # iOS permissions & config
│   │   └── LaunchScreen.storyboard
│   └── VisionCameraApp.xcworkspace/
└── Gemfile                    # Ruby dependencies for iOS
```

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

### General Requirements
- **Node.js** >= 18.x
- **npm** or **yarn**
- **Git**

### iOS Development (macOS only)
- **Xcode** >= 14.0
- **CocoaPods** >= 1.12.0
- **Ruby** >= 2.7

### Android Development
- **Android Studio** >= Flamingo
- **Android SDK** >= 24 (Android 7.0)
- **JDK** >= 17

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Kritchanaxt/CameraPreview-ReactNative.git
cd CameraPreview-ReactNative
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. iOS Setup (macOS only)

```bash
# Install Ruby dependencies
bundle install

# Install CocoaPods dependencies
cd ios
pod install
cd ..
```

### 4. Android Setup

Ensure your Android environment is properly configured:

```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## ⚙️ Configuration

### Camera Permissions

#### Android (`android/app/src/main/AndroidManifest.xml`)

The following permissions are already configured:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

#### iOS (`ios/VisionCameraApp/Info.plist`)

The following usage descriptions are already configured:

```xml
<key>NSCameraUsageDescription</key>
<string>$(PRODUCT_NAME) needs access to your Camera.</string>
<key>NSMicrophoneUsageDescription</key>
<string>$(PRODUCT_NAME) needs access to your Microphone for recording videos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to your photo library to save photos/videos.</string>
```

---

## 🚀 Usage

### Running the App

#### Start Metro Bundler

```bash
npm start
# or
yarn start
```

#### Run on iOS

```bash
npm run ios
# or
yarn ios
```

#### Run on Android

```bash
npm run android
# or
yarn android
```

### App Features Guide

#### 1. Camera Preview
When you launch the app, it automatically detects available camera devices and displays the camera preview.

#### 2. Switch Camera (🔄)
Tap the rotation icon to switch between front and back cameras.

#### 3. Camera Settings (⚙️)
Tap the settings icon to view all available camera devices with their specifications:
- Physical device types (wide-angle, ultra-wide, telephoto)
- Maximum video resolution
- Maximum photo resolution

#### 4. Resolution Selection (🖼️)
Tap the image icon to:
1. **Select Aspect Ratio**: Choose from Square (1:1), 4:3, 3:4, 16:9, or 9:16
2. **Select Resolution**: Pick from available resolutions based on your device capabilities

#### 5. Take Photo
Tap the red capture button to take a photo. An alert will display:
- File path
- Raw resolution
- File size

---

## 🔤 Digital Ink & OCR Integration

This project can be extended to include Digital Ink recognition and OCR (Optical Character Recognition) capabilities. Here's how to integrate these features:

### Google ML Kit Integration

#### Installation

```bash
# Install ML Kit dependencies
npm install @react-native-ml-kit/text-recognition
npm install @react-native-ml-kit/digital-ink-recognition
```

#### Text Recognition (OCR)

```typescript
import TextRecognition from '@react-native-ml-kit/text-recognition';

// Recognize text from image
const recognizeText = async (imagePath: string) => {
  try {
    const result = await TextRecognition.recognize(imagePath);
    console.log('Recognized text:', result.text);
    
    // Access individual blocks
    result.blocks.forEach(block => {
      console.log('Block:', block.text);
      block.lines.forEach(line => {
        console.log('Line:', line.text);
      });
    });
    
    return result;
  } catch (error) {
    console.error('OCR Error:', error);
  }
};
```

#### Digital Ink Recognition

```typescript
import DigitalInkRecognition from '@react-native-ml-kit/digital-ink-recognition';

// Initialize the recognizer with a language model
const initializeInkRecognizer = async () => {
  const model = await DigitalInkRecognition.getModel('en-US');
  await model.download();
  return model;
};

// Recognize handwritten strokes
const recognizeInk = async (strokes: Stroke[]) => {
  try {
    const result = await DigitalInkRecognition.recognize(strokes);
    console.log('Recognition result:', result.candidates);
    return result.candidates[0]?.text;
  } catch (error) {
    console.error('Ink Recognition Error:', error);
  }
};

// Stroke interface
interface Stroke {
  points: { x: number; y: number; t: number }[];
}
```

### Integration with Camera

```typescript
// After taking a photo, perform OCR
const onPressTakePhoto = async () => {
  if (camera.current == null) return;
  
  const photo = await camera.current.takePhoto({
    qualityPrioritization: 'quality',
  });
  
  // Perform OCR on the captured photo
  const ocrResult = await recognizeText(photo.path);
  
  Alert.alert(
    'Text Recognized',
    ocrResult?.text || 'No text found'
  );
};
```

### Supported Languages for OCR

| Language | Code |
|----------|------|
| English | `en` |
| Chinese | `zh` |
| Japanese | `ja` |
| Korean | `ko` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Italian | `it` |
| Portuguese | `pt` |

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test
# or
yarn test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```typescript
// __tests__/App.test.tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
```

### Writing Custom Tests

```typescript
// __tests__/Camera.test.tsx
import { findBestFormatForResolution } from '../App';

describe('Camera Format Selection', () => {
  test('should find best format for 1080x1920 resolution', () => {
    const mockDevice = {
      formats: [
        { photoWidth: 1920, photoHeight: 1080, fieldOfView: 75 },
        { photoWidth: 3024, photoHeight: 4032, fieldOfView: 75 },
      ],
      physicalDevices: ['wide-angle-camera'],
    };
    
    const result = findBestFormatForResolution(
      mockDevice,
      { width: 1080, height: 1920 },
      '9x16 Portrait (9:16)'
    );
    
    expect(result).toBeDefined();
  });
});
```

### Linting

```bash
# Run ESLint
npm run lint
# or
yarn lint
```

---

## 🔧 Troubleshooting

### Common Issues

#### iOS: Camera not working on Simulator
- The iOS Simulator doesn't support camera functionality
- Use a physical iOS device for testing

#### Android: Camera permission denied
```bash
# Clear app data and reinstall
adb uninstall com.visioncameraapp
npm run android
```

#### Metro Bundler Issues
```bash
# Clear Metro cache
npm start -- --reset-cache
```

#### CocoaPods Issues
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

#### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- [react-native-vision-camera](https://react-native-vision-camera.com/) - The amazing camera library
- [React Native](https://reactnative.dev/) - The framework
- [Google ML Kit](https://developers.google.com/ml-kit) - For OCR and Digital Ink capabilities


