# NEXUS Android alarm bridge

The existing NEXUS website is a Next.js server application/PWA. Browser timers cannot reliably ring after the browser or app process is closed. This change adds a Capacitor Local Notifications bridge so the Android APK can hand alarm schedules to Android's native alarm manager.

## What this integration does

- Keeps the existing web alarm UI and local alarm list.
- When running inside the Capacitor Android app, mirrors enabled alarms to native local notifications.
- Supports one-time alarms and weekly day selections.
- Requests Android notification permission and directs the user to Android's **Alarms & reminders** setting when exact-alarm access is missing.
- Uses Android's alarm notification channel with vibration and the system notification sound.

A local notification is not yet a full-screen, continuously ringing Clock-app alarm. That requires a dedicated native foreground alarm service/activity and an alarm audio asset. This integration provides OS-scheduled alert notifications while the web app is closed; do not describe it as a verified full ringtone until that native service is added and tested on physical Android devices.

## Build the Android wrapper

1. Install dependencies: npm install.
2. Set CAPACITOR_SERVER_URL to the real HTTPS origin where NEXUS is deployed. Do not include a page path. Example format: https://your-nexus-host.example.
3. Generate the Android project once: npx cap add android.
4. Open android/app/src/main/AndroidManifest.xml and add this permission directly under the manifest element:

   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

5. Sync native plugins: npx cap sync android.
6. Open the project with npx cap open android, build a signed APK/AAB in Android Studio, and install it on a physical Android device.
7. On first use, allow notifications and grant **Alarms & reminders** access when Android opens the setting screen.

The web deployment alone does not create or update an APK. The native Android project must be generated, synced, built, installed and tested separately. Android battery restrictions and manufacturer-specific power management can still affect delivery; verify on the target device.

## Test checklist

- Schedule a one-time alarm 2–3 minutes ahead, then close NEXUS.
- Repeat with the screen locked.
- Test a weekly alarm on the current weekday.
- Deny notification permission and confirm the UI reports the missing permission.
- Deny exact-alarm access and confirm the UI explains how to enable it.
- Edit, disable and delete alarms; confirm stale native schedules are removed.
- Reboot the device and verify Android retains the scheduled notification.
