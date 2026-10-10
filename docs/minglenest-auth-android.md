# MingleNest authentication and Android release checklist

The published web URL is not known in this project. Set `VITE_PUBLIC_APP_URL=https://YOUR-PUBLISHED-MINGLENEST-URL` before publishing the web app. Do not use localhost in a production build.

In Supabase → Authentication → URL Configuration, set **Site URL** to that exact HTTPS origin and add both `https://YOUR-PUBLISHED-MINGLENEST-URL/auth/callback` and `com.minglenest.app://auth/callback` to **Redirect URLs**. Leave **Confirm email** enabled. The Site URL cannot be changed through an ordinary database migration. Test a confirmation email on both web and Android after updating this configuration.

The native Android directory is not present in this repository. Before producing a Capacitor APK/AAB, generate/sync the Android project, then add this intent filter to the existing MAIN Android activity in `android/app/src/main/AndroidManifest.xml` (do not replace the activity or its existing filters):

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.minglenest.app" android:host="auth" android:path="/callback" />
</intent-filter>
```

Add `<uses-permission android:name="android.permission.RECORD_AUDIO" />` to the manifest if the generated Capacitor Android manifest does not already contain it. On Android the existing `getUserMedia({audio:true})` request triggers the WebView microphone permission dialog only when the native WebChromeClient grants requests; verify recording on an installed Android build. Do not claim native recording or deep linking is verified from the web preview.

For two real test users, sign up twice in the app using two inboxes **you own**, confirm both emails, then sign into separate devices/browser profiles. The Auth trigger creates matching `profiles`/`chat_users` entries automatically. Never insert bare `auth.users` rows with SQL: they lack managed identities/confirmation flows and could expose shared test credentials. Do not use somebody else's domain or add credential-bearing seeds to production. Delete the test accounts via the supported Auth admin process when testing is complete.
