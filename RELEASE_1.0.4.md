# Windows 1.0.4 / Android 1.0.8-beta

Release date: 25 October 2026 (Asia/Tokyo).

Both apps now display a circular HH:MM:SS countdown to the next of the five daily prayers. The countdown advances automatically at prayer time and refreshes the schedule when the date changes. Sunrise and sunset are clearly marked as informational times and never selected for azaan. API sunset remains distinct from Maghrib; offline sunset comes from the astronomical sunset property.

Android uses the current Capacitor notification interface, clears legacy sunrise alarms once at startup, and uses a separate notification ID for each prayer so advancing the countdown does not cancel the azaan that has just started. Dedicated Fajr and four-prayer audio files are preserved. Older cached schedules remain usable offline; a missing sunset is shown as --:-- until an updated schedule is available.

Validation:
- Prayer transition, sunrise/sunset exclusion, midnight countdown, native notification selection, permission denial and legacy-notification cleanup regression tests.
- Desktop offline calculation and API-failure fallback; distinct API sunset/Maghrib mapping.
- Headless browser checks at mobile widths 334/390/520 and desktop widths 760/980; seven timings, ticking countdown, prayer rollover, audio start/stop, no JavaScript errors or horizontal overflow. Screenshots inspected.
- Packaged Windows app launched with an isolated profile: real preload/IPC, offline prayer times, countdown and bundled audio start/stop passed.
- Android production web build, Capacitor sync, APK compilation, unit tests and lint.
- APK signer must match the previous public beta before publication.

Android lint's ProtectedPermissions result on SCHEDULE_EXACT_ALARM is suppressed only on that declaration, with a documentation reference. This permission is user-grantable Alarms & reminders access and is required by Capacitor's exact notification scheduling. Existing non-blocking template/resource/dependency warnings remain.

Limitations: No physical Android device or emulator was connected. Real notification timing/sound delivery under Android battery restrictions is not device-tested in this release. Android remains a sideloaded debug-signed beta using the same signing certificate as the previous beta. Windows remains an unsigned installer. After Isha, tomorrow's countdown initially uses the current schedule's Fajr until the daily schedule refresh; this behavior is inherited from the previous schedule logic.

Rollback: retain public Windows 1.0.3 and Android 1.0.7-beta downloads and GitHub release v1.0.3. Revert the release commit to restore the landing page and downloads/latest.json. Android does not allow installing a lower versionCode over the newer beta.

Reproduce JavaScript checks from the repository root:

```powershell
node prayer-regression.cjs
node service-regression.cjs
npm install --prefix release-work/tools --no-save electron-builder@26.0.12 playwright@1.56.1
node tests/browser-smoke.cjs
node tests/electron-smoke.cjs
```

Browser checks require Microsoft Edge in its standard Windows installation path and a current mobile production build. Electron checks require the unpacked Windows build in release-work/windows/win-unpacked. Test profiles and screenshots remain inside ignored release-work/.
