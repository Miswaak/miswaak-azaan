# 🕌 Miswaak Azaan

A simple desktop app that plays Azaan based on your location.

## 🌍 Features
- Global prayer time support
- Automatic Azaan playback
- Manual test Azaan button
- Clean desktop UI

## 🚀 Download
https://github.com/Miswaak/miswaak-azaan/releases

## 📥 How to Install

1. Download the `.exe` from Releases
2. Run the installer
3. Launch "Miswaak Azaan"
4. Select your city
5. Done

## ⚠️ Windows Warning

This app is currently unsigned, so Windows may show a security warning.

To install:
1. Click "More info"
2. Click "Run anyway"

This is safe for this community release.

## Windows code signing

Windows builds are signing-ready, but they require a real Authenticode code-signing certificate.

Before creating a signed release, set:

- `CSC_LINK`: path to a `.pfx` / `.p12` certificate file, or a base64-encoded certificate
- `CSC_KEY_PASSWORD`: certificate password

Then run:

```powershell
npm run dist:signed
```

If Windows reports `Cannot create symbolic link` while electron-builder downloads `winCodeSign`, run the build from an elevated terminal or enable Windows Developer Mode. Unsigned community builds can still be created with `npm run dist`.

Do not commit certificate files or passwords. Certificate file extensions are ignored by `.gitignore`.

## 🌐 Website
https://miswaakofficial.com
