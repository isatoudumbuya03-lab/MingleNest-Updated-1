<!-- genvibe-memory covers:26cGNNxIvqatZR44 -->
## What this app is
MingleNest is an existing Vite/React/TypeScript app with Capacitor configuration for Android (`com.minglenest.app`). It combines social profiles, posts, Stories, Status, private chats, contact discovery, Gemini-powered Kids Stories, and a Premium subscription page. Supabase project `amljaleklvaawyyqauyl` is connected.

## Built so far
- Home, Profile, Chats, Stories, Kids Stories, and Status use the existing Supabase account/session.
- Email/password sign-up and sign-in; Google OAuth is wired through Supabase but reported disabled, with no local Client IDs. Forgot-password redirect/recovery remains unresolved.
- Phone verification was removed from normal registration, login, and profile use. Email-confirmation settings were not changed. The Edit Profile phone section and verification button were removed; `src/PhoneVerification.tsx` and `src/contactPhone.ts` were deleted.
- People search uses usernames; a Message button was added, and duplicate usernames are handled. Changes reported in `src/ContactsPanel.tsx` and `src/App.tsx`.
- Chats has username search, conversation list and profile-card messaging, using real conversation data. Saved contacts and Add Contact were removed. Chats styling, real unread badges/read tracking, and voice-message completion markers were added.
- Custom MingleNest delete confirmations were added for Stories, photos, videos, posts, chat messages, Kids Stories, Status, and Profile gallery items. Gallery deletion targets the selected item, checks ownership, and removes video storage files. Status deletion retains ownership checks and media cleanup.
- A Premium page opens from Profile and compares Free and Premium features. Premium payments are not connected; Subscribe cannot unlock Premium. `premium_entitlements` has row-level security so users can read only their own row.
- Help & Support was added as a Profile row above “Delete account.” `src/Support.tsx` displays `minglenest.support@gmail.com`, provides a “Contact Support” button that opens the user’s email app with the support address, subject, and message pre-filled, and includes the user’s account email and username. A copy-email button and fallback instructions are provided. Support emails are sent from the user’s own mail account, so Gmail replies go to the user. Changes reported in `src/Support.tsx` and `src/App.tsx`.
- Existing logo, colors, bottom navigation, and core features were preserved. Preview remained on sign-in, so Chats changes could not be visually confirmed.
- Older warnings/type errors remain in `App.tsx`, `StatusPanel.tsx`, and `i18n.tsx`.

## Design
Lavender background, royal-purple actions, blue/green highlights, charcoal text, white surfaces, bold readable typography. Preserve existing logo, branding, layout, and bottom navigation. Chats uses a clean, modern WhatsApp-like appearance and existing palette; its search field has light-blue fill and rounded shape. Unread badges and voice-unplayed markers are purple. Delete dialogs use a white rounded card and dimmed backdrop. Premium uses existing MingleNest purple/lavender colors.

## Structure
Vite + React + TypeScript, Capacitor configuration, Supabase backend/storage/Edge Functions. Key files include `src/App.tsx`, `src/index.css`, `src/i18n.tsx`, `src/ContactsPanel.tsx`, `src/ChatList.tsx`, `src/chats-redesign.css`, `src/StatusPanel.tsx`, `src/StatusRow.tsx`, `src/StoryInteractions.tsx`, `src/ChatAttachments.tsx`, `src/SafeVideo.tsx`, `src/StoryMedia.tsx`, `src/statusMedia.ts`, `src/ChatNotice.tsx`, `src/final-fixes.css`, `src/ProfileMedia.tsx`, `src/profile-media.css`, `src/VoicePlayer.tsx`, `src/billing.ts`, `src/Premium.tsx`, `src/premium.css`, and `src/Support.tsx`. Phone-related files were removed. Native `android/` project is absent.

## User preferences & rules
- Continue the existing app; inspect current code and backend before changes, make targeted changes, preserve working features and existing data.
- Remove phone-number requirements and SMS verification from normal registration, login, and profile use.
- Never show users raw database IDs, UUIDs, storage keys, or long technical numbers in user-facing messages.
- Use custom MingleNest delete confirmations, not browser pop-ups. Cancel or outside click must not delete; delete only after confirmation. Preserve specified wording and per-item gallery deletion behavior.
- Preserve branding, languages, navigation, existing data and functionality unless explicitly requested. Keep credentials server-side.
- Do not change package ID or Supabase project, publish, push to GitHub, create another account system, or recreate `android/` without authorization.
- Keep normal Stories separate from Kids Stories; preserve approved Little moments behavior and chat read-state behavior.
- Do not create duplicate tables/features, delete or overwrite user data, or modify the database before reporting findings.
- For Chats, keep the existing logo, colors, and bottom navigation; keep the search field small, rounded, and contained in its card. Do not redesign unrelated screens.
- For Premium, do not enable fake payments or unlock Premium by tapping Subscribe.
- Support email: `minglenest.support@gmail.com`. Contact Support should open the user’s email app with this recipient; users send from their own email account so support can reply to them.

## Open issues & next ideas
- Premium billing is not connected; implement real subscription purchases and management before enabling entitlements.
- Test username search and messaging with two real accounts and on Android.
- Verify phone-free account creation/use and confirm no normal flow requires SMS.
- Test unread/read behavior, voice completion tracking, real deletions, user-facing messages, gallery deletion and storage cleanup.
- Visually verify Chats when preview can reach it; latest preview remained on sign-in.
- Check Profile media, Stories/Status, chat read-state, video, contacts, auth/uploads, password recovery, Google provider configuration, support email flow, and `.aab` packaging.
- Older type warnings/errors remain in `App.tsx`, `StatusPanel.tsx`, and `i18n.tsx`.
