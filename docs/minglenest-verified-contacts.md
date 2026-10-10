# MingleNest verified phone contacts

## Implemented
- Existing email/password session and UUID remain the identity for profile, Stories, Posts, Contacts and private Chat. No signup or phone-login endpoint was introduced.
- Edit Profile now includes a private phone field, SMS code request, resend cooldown, verification, and cancellation.
- `supabase.auth.updateUser({phone})` starts **phone change verification** on the current account. `verifyOtp({type:'phone_change'})` confirms the number on that SAME account. Never use `signInWithOtp` here.
- An Auth trigger copies only confirmed Auth phone numbers into `public.profile_private_phones`. This separate private profile extension avoids adding phone numbers to publicly readable profiles. Client writes to this table are prohibited; RLS allows only its owner to read it.
- Contact discovery now matches only verified phone numbers (not emails). Country selection converts local numbers to valid E.164 using libphonenumber-js; default country is Gambia, selectable and saved. Explicit +220 and 00220 work regardless of country selection. Arabic/Persian digits normalize too.
- Contacts reads names/phones only, after a system permission grant. No contacts are saved locally or in the database. Requests use bounded batches of SHA-256 phone digests. Server returns public profile fields and matching digest, not phone numbers. Hashes are pseudonymous and guessable, not encryption. Authenticated requests are bounded to 500 digests/request and 10,000/hour/account. This mitigates but cannot completely prevent phone-membership enumeration by malicious registered users.
- Matched users show avatars and usernames, open a public profile, and open the existing private chat. Unmatched contacts can be invited by the device's SMS composer (or share sheet). No invitation is sent automatically. No verified match is not proof a person has no account.
- Denial, empty address book, no matches, request failure and loading states leave username search available.
- New labels use all eight existing dictionaries; no language engine or existing design was replaced. Voice recording/playback code is unchanged.

## Required Supabase SMS configuration (not configured by this code)
SMS cannot be sent without an SMS provider on the EXISTING Supabase project. No SMS provider credentials were supplied to this workspace, and the available database tools cannot configure Auth provider settings.
1. In project `amljaleklvaawyyqauyl`, open Authentication > Sign In / Providers > Phone.
2. Configure an SMS provider supported by Supabase (for example Twilio) using your private provider credentials in Supabase, NOT in app source. Enable Phone and save. Keep email confirmation enabled and existing redirect URLs unchanged.
3. Ensure the provider supports delivery to +220 and any other target country and production sender/geographic permissions. Provider SMS charges may apply; no calling service was added.
4. Keep secure phone change enabled if available: accounts with an existing verified phone may require confirmation codes for both the old and new number. Enter the old-number code first, then the new-number code. A completed UI verification is only shown when the database reflects the confirmed number.
5. Never manually populate the private table to bypass verification. Never use production test OTP bypasses.

## Android integration
This repository contains Capacitor configuration but NO `android/` source tree. The existing native application must be used; no replacement scaffold or application ID was generated.
- Installed: `@capacitor-community/contacts` 8.x, compatible with existing Capacitor 8.
- `package.json` includes `capacitor:sync:after`; the hook adds `<uses-permission android:name="android.permission.READ_CONTACTS" />` to the existing Android manifest after sync. It also restricts Contacts 8's combined read/write native permission alias to READ_CONTACTS in the installed plugin source, since discovery never writes contacts. This idempotent hook reapplies after dependency installs/syncs. It does not add WRITE_CONTACTS, change the ID, or touch microphone/deep-link settings.
- In the existing native repository with these changes, run `yarn install`, then `npx cap sync android` after producing the normal web distribution. Capacitor registers the Contacts plugin and runs the permission hook. Rebuild the existing Android package using your normal workflow.
- If syncing outside this package's hooks, run `node scripts/configure-android-contacts.cjs` and confirm the permission is a direct child of `<manifest>` in `android/app/src/main/AndroidManifest.xml`.
- A web-only update cannot install native plugin/manifest changes. Keep `applicationId com.minglenest.app` exactly unchanged.

## Tests and limitations
Automated normalization/hash tests: `yarn test:contacts`. Translation catalog check: `node scripts/check-translations.cjs`. These are NOT physical-device tests.
No two real Android phones or SMS-provider configuration were available. SMS delivery, native permission prompts, native contact reading and two-account chat navigation must still be verified on hardware. No accounts or fake verified phone rows were seeded.

## Required two-account acceptance test
1. Account A logs in once with existing email/password. Edit Profile > Private phone number. Enter an actual owned +220 number, request SMS, enter the code. Confirm verified number remains after reopening; verify it is absent from public profile and other users' direct database reads.
2. Account B (a distinct existing account) saves A's number in Android Contacts. Test international +220, 00220, and local formats with Gambia selected.
3. B opens Chat > Find phone contacts, grants permission, sees A's avatar/username, opens profile and opens conversation. Send real messages using existing chat. Reopen and confirm persistence.
4. Deny permission on B and ensure username search and existing chat still work. Test empty contacts, wrong/expired SMS code, resend, failed network, number changes, unmatched invitation composer, Arabic RTL and Chinese.
5. Attempt another user's private-phone read with B's authenticated client: expect zero rows. Attempt direct private-phone inserts/updates: expect permission denial. Only confirmed A should match.
6. Secure phone change may require old and new SMS codes; test both before final release. Do not claim completion of SMS or Android testing from browser-only checks.

## Changed files
`src/contactPhone.ts`, `src/PhoneVerification.tsx`, `src/ContactsPanel.tsx`, targeted Profile insertion in `src/App.tsx`, new rows in `src/i18n.tsx`, scoped additions to `src/social-interactions.css`, `package.json`/`yarn.lock`, `scripts/configure-android-contacts.cjs`, `scripts/test-contact-phone.cjs`, and `supabase/migrations/private_verified_phone_contacts.sql`.
