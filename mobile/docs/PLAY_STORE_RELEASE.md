# Google Play Release Checklist

## Account

- Use the Miswaak Google account for Google Play Console enrollment.
- Keep the Play Console owner account under Miswaak control.
- Complete Google identity, payment, and developer profile verification in the browser.

## Current Local Artifacts

- Debug APK for direct testing: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release bundle candidate: `android/app/build/outputs/bundle/release/app-release.aab`

## Versioning

- Android package: `com.miswaak.azaan.mobile`
- Current Android beta version name: `1.0.1-beta`
- Current Android beta version code: `2`

For every future Android release:

- Increase `versionCode` in `android/app/build.gradle`.
- Update `versionName` when the public version changes.
- Update `APP_VERSION_CODE` in `src/app.js`.
- Update `downloads/latest.json` after publishing.

## In-App Update Notice

The app checks:

`https://miswaak.github.io/miswaak-azaan/downloads/latest.json`

If `android.versionCode` is higher than the installed app's `APP_VERSION_CODE`, the app shows an update banner. Before Play Store approval, the update button can point to the direct APK. After Play Store approval, set `android.playStoreUrl` in the manifest.

## Signing

Google Play requires a signed Android App Bundle. Before the first Play upload, create a Miswaak upload key and keep it backed up securely. Do not commit keystores, passwords, or signing properties to Git.

Recommended local-only files:

- `mobile/android/miswaak-upload-key.jks`
- `mobile/android/keystore.properties`

Both should stay ignored by Git.

## Store Listing

Prepare:

- App name: Miswaak Azaan
- Short description
- Full description
- App icon
- Phone screenshots
- Privacy policy URL
- Data safety answers
- Content rating questionnaire
- Internal testing email list

## First Release Path

1. Enroll Miswaak Google account in Play Console.
2. Create the app in Play Console.
3. Create or configure upload signing key.
4. Upload signed `.aab` to Internal testing.
5. Complete store listing, privacy, data safety, and content rating.
6. Test from Play internal testing.
7. Promote to production after review readiness.
