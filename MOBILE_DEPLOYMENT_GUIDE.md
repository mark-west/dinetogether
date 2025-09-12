# DineTogether Mobile App Deployment Guide

## 🎯 Overview

Your DineTogether webapp has been successfully packaged for **iOS and Android** using **Capacitor**. This maintains your single codebase while creating native mobile app containers.

## ✅ What's Completed

- ✅ **Capacitor installed and configured**
- ✅ **iOS and Android platforms added**
- ✅ **Build process optimized for mobile**
- ✅ **API connectivity configured** for mobile apps
- ✅ **Web assets successfully synced** to mobile platforms

## 🔧 Prerequisites for Local Development

### For iOS Development (macOS required):
- **Xcode** (latest version from App Store)
- **Xcode Command Line Tools**: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods`

### For Android Development:
- **Android Studio** (latest version)
- **Android SDK** (included with Android Studio)
- **Java 11** or higher

## 🚀 Mobile Build Commands

Since package.json editing is restricted, run these commands manually:

### 1. Build for Mobile
```bash
# Build web assets for mobile
vite build

# Sync with mobile platforms
npx cap sync
```

### 2. Open in Native IDEs
```bash
# Open iOS project in Xcode
npx cap open ios

# Open Android project in Android Studio  
npx cap open android
```

### 3. Production Mobile Builds
```bash
# Build iOS app bundle
npx cap build ios

# Build Android APK/AAB
npx cap build android
```

## 🌐 API Configuration for Mobile

### Important: Configure Backend URL

1. **Copy the mobile environment template:**
   ```bash
   cp .env.mobile .env.production
   ```

2. **Edit `.env.production` with your deployed app URL:**
   ```env
   VITE_API_BASE_URL=https://your-deployed-app.replit.app
   ```

3. **Build with environment:**
   ```bash
   vite build --mode production
   npx cap sync
   ```

### How It Works:
- **Web version**: Uses relative URLs (`/api/*`) - works in browser
- **Mobile version**: Uses absolute URLs (`https://your-app.replit.app/api/*`) - works in mobile WebView

## 📱 Publishing to App Stores

### iOS App Store

1. **In Xcode:**
   - Open `ios/DineTogether.xcworkspace` (not .xcodeproj)
   - Select your development team
   - Configure app signing
   - Set version and build number

2. **Build for release:**
   - Product → Archive
   - Upload to App Store Connect
   - Complete app review submission

3. **Required assets:**
   - App icons (multiple sizes)
   - Launch screens
   - App Store screenshots
   - Privacy policy URL

### Google Play Store

1. **In Android Studio:**
   - Open `android/` folder
   - Configure signing keys
   - Set version in `android/app/build.gradle`

2. **Build for release:**
   - Build → Generate Signed Bundle/APK
   - Choose Android App Bundle (AAB)
   - Upload to Google Play Console

3. **Required assets:**
   - App icons (adaptive icons)
   - Feature graphic
   - Screenshots (phone, tablet)
   - Store listing details

## 🔄 Development Workflow

### Daily Development:
1. **Develop in web** (fastest iteration)
2. **Test in browser** using your existing workflow
3. **Periodically test on mobile** when needed

### Mobile Testing:
```bash
# 1. Build latest web assets
vite build

# 2. Sync to mobile platforms  
npx cap sync

# 3. Test in simulators/devices
npx cap run ios     # iOS Simulator
npx cap run android # Android Emulator
```

### Adding Features:
- **Keep developing in your existing React/Express codebase**
- **No platform-specific code needed** - Capacitor wraps everything
- **Single source of truth** - your webapp

## 🛠️ Troubleshooting

### API Issues:
- **Problem**: API calls fail in mobile app
- **Solution**: Verify `VITE_API_BASE_URL` is set correctly
- **Check**: URLs should be absolute in mobile builds

### Build Issues:
- **iOS**: Run `cd ios && pod install` if dependencies fail
- **Android**: Run `./gradlew clean` in android/ folder
- **General**: Delete `dist/public/` and rebuild

### Performance:
- **Large bundle warning**: Consider code splitting if needed
- **Startup time**: Optimize images and reduce initial bundle size

## 📋 App Store Requirements

### iOS Requirements:
- **Privacy Policy** (required for App Store)
- **App Transport Security** (HTTPS only)
- **App icons** in all required sizes
- **Launch screens** for all device sizes

### Android Requirements:
- **Target API level** (latest recommended)
- **Privacy Policy** (required for Play Store)
- **App signing** (upload key)
- **64-bit architecture** support

## 🔒 Security Considerations

### Production Checklist:
- ✅ **HTTPS only** for API endpoints
- ✅ **Secure API keys** (stored in environment variables)
- ✅ **CORS configured** for your mobile app domain
- ✅ **Authentication** works across web and mobile
- ✅ **Session management** properly configured

## 🎉 Next Steps

1. **Set up local development environment** (Xcode/Android Studio)
2. **Configure your deployed backend URL** in `.env.production`
3. **Test on real devices** using development builds
4. **Prepare app store assets** (icons, screenshots, descriptions)
5. **Submit to app stores** following their guidelines

## 📞 Support

Your mobile app setup is complete and ready for deployment! The same codebase now powers:
- **Web application** (existing)
- **iOS native app** (new)
- **Android native app** (new)

All three versions share the same features, data, and user experience. 🚀