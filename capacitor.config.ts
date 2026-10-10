import type { CapacitorConfig } from '@capacitor/cli'

// Wraps the existing MingleNest web app as an Android app.
// No screen-capture blocking (FLAG_SECURE) is set anywhere, so screenshots,
// screen recording and copy/paste behave normally on the device.
const config: CapacitorConfig = {
  appId: 'com.minglenest.app',
  appName: 'MingleNest',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
