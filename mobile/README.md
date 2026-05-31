# Miswaak Azaan Mobile

Android-first mobile app project for Miswaak Azaan.

## Status

This is the mobile workspace. It starts as a Vite web app and now includes a Capacitor Android project. The iPhone path is planned, but Android comes first because Android offers more practical options for exact prayer alerts.

Current verified state:

- `npm run build` passes.
- Android platform has been added under `android/`.
- `npm run cap:sync` passes.
- Android launcher foreground assets use the Miswaak logo.
- Rayhan's azaan audio is included for in-app playback and copied into Android native resources for notification sound work.
- Local Android debug APK build passes.
- Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.
- In-app update notice checks the hosted `downloads/latest.json` manifest.
- Google Play release planning is documented in `docs/PLAY_STORE_RELEASE.md`.

## Local web test

After installing dependencies:

```powershell
npm install
npm run dev
```

## Android build path

```powershell
npm install
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

This Windows machine has been prepared with:

- JDK 21 at `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`
- Android SDK at `%LOCALAPPDATA%\Android\Sdk`
- Android SDK Platform 35
- Android Build-Tools 35.0.0 and 34.0.0
- Android Platform-Tools

Android Studio is still useful for emulator/device builds. For command-line builds on this machine, use JDK 21 and keep Gradle's user cache in LocalAppData if the project drive blocks Gradle lock files:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = "$env:LOCALAPPDATA\MiswaakAzaanMobile\GradleHome"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
cd android
.\gradlew.bat :app:assembleDebug --no-daemon
```

## Current mobile behavior

- Uses Aladhan API for prayer times.
- Uses Tokyo/Japan as the default location.
- Can use browser/device geolocation when allowed.
- Uses Rayhan's azaan audio for playback.
- Includes a notification adapter for Capacitor Local Notifications.
- Falls back to browser notifications during local web testing.
- Schedules the next prayer notification when running inside the Android Capacitor app.

## iPhone note

iPhone support should be added after Android. iOS can show prayer notifications, but full automatic background azaan playback is restricted. The practical iPhone behavior is notification-first, then tap-to-open for full azaan playback.
