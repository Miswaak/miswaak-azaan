# Miswaak Azaan

A production-ready Windows desktop app for prayer times. It uses the Aladhan API first and falls back to local calculation with the `adhan` library when the network or API is unavailable.

## Features

- Aladhan API integration
- Offline fallback calculation with `adhan`
- Configurable city, country, latitude, longitude, calculation method, and madhab
- Default Tokyo configuration
- Local config persistence
- Error handling and file logging
- Windows `.exe` packaging with Electron Builder

## Setup

```powershell
npm install
npm start
```

## Build `.exe`

```powershell
npm run dist
```

The installer will be created in `release/`.

## Config

The default config lives in `config/default-config.json`. At runtime, user changes are stored in the app data directory by `electron-store`.

For reliable offline fallback, set latitude and longitude. City-only mode works online through Aladhan, but offline city geocoding is intentionally not guessed unless coordinates are present.

