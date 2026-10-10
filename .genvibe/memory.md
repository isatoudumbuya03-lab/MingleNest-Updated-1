<!-- genvibe-memory covers:aVdoDw0RoMoiLg4b -->
## What this app is
MingleNest is an existing Vite/React/TypeScript app with Capacitor configuration for Android (`com.minglenest.app`). It combines social profiles, posts, Stories, Status, private chats, contact discovery, and Gemini-powered Kids Stories. Supabase project `amljaleklvaawyyqauyl` is connected.

## Built so far
- Home, Profile, Chats, Stories, Kids Stories, and Status use the existing Supabase account/session.
- Email/password sign-up and sign-in; Google OAuth is wired through Supabase but reported disabled, with no local Client IDs. Forgot-password redirect/recovery remains unresolved.
- Phone verification was removed from normal registration, login, and profile use. Email-confirmation settings were not changed. The Edit Profile phone section and verification button were removed; `src/PhoneVerification.tsx` and `src/contactPhone.ts` were deleted.
- People search uses usernames; a Message button was added, and duplicate usernames are handled. Changes reported in `src/ContactsPanel.tsx` and `src/App.tsx`.
- Chats has username search, conversation list and profile-card messaging, using real conversation data. Saved contacts and Add Contact were removed.
- Chats visual CSS was adjusted in `src/chats-redesign.css`: search bar set to 40px tall, fully rounded and contained within its card while retaining the light-blue fill; card padding set to 16px; heading, empty state and rows aligned within the card; excess minimum heights and gaps tightened.
- Chats list and bottom-navigation badges use real messages and existing `last_read_at` tracking. They count incoming text, photo, video, and voice messages, skip the user’s own messages, and clear when opening a conversation successfully saves the read time.
- Received voice messages show a purple dot until played through to completion. Opening a conversation or pausing early does not clear it; own voice messages have no dot. Added `message_listens` table with row-level security. Changes reported in `src/VoicePlayer.tsx` and `src/App.tsx`.
- Delete confirmations and user-facing delete messages were updated in `src/App.tsx` for Stories, photos, videos, posts, chat messages, and Kids Stories. Post deletion requires confirmation; Kids Stories use a shared dialog rather than a browser confirm.
- Profile Photos and Videos galleries have per-item three-dot menus with Delete. Custom MingleNest confirmation dialogs use “Delete this photo?” or “Delete this video?” with Cancel and Delete. Cancel leaves the item unchanged. Confirming deletes only the selected post row using its ID and account ownership check; the gallery and posts list update. Video storage files are also removed. Changes reported in `src/ProfileMedia.tsx`, `src/App.tsx`, and `src/profile-media.css`.
- Delete Status uses a custom MingleNest dialog in `src/StatusPanel.tsx`; deletion occurs only after confirmation. Ownership checks and media cleanup remain unchanged; no database changes were made.
- Existing logo, colors, bottom navigation, single search bar, new-message button, and chat functionality were preserved. Preview remained on sign-in, so Chats changes could not be visually confirmed.
- Older warnings/type errors remain in `App.tsx`, `StatusPanel.tsx`, and `i18n.tsx`.

## Design
Lavender background, royal-purple actions, blue/green highlights, charcoal text, white surfaces, bold readable typography. Preserve existing logo, branding, layout, and bottom navigation. Chats uses a clean, modern WhatsApp-like appearance and existing palette; search field has light-blue fill and rounded shape. Unread badges and voice-unplayed markers are purple. Delete dialogs use a white rounded card and dimmed backdrop.

## Structure
Vite + React + TypeScript, Capacitor configuration, Supabase backend/storage/Edge Functions. Key files include `src/App.tsx`, `src/index.css`, `src/i18n.tsx`, `src/ContactsPanel.tsx`, `src/ChatList.tsx`, `src/chats-redesign.css`, `src/StatusPanel.tsx`, `src/StatusRow.tsx`, `src/StoryInteractions.tsx`, `src/ChatAttachments.tsx`, `src/SafeVideo.tsx`, `src/StoryMedia.tsx`, `src/statusMedia.ts`, `src/ChatNotice.tsx`, `src/final-fixes.css`, `src/ProfileMedia.tsx`, `src/profile-media.css`, and `src/VoicePlayer.tsx`. Phone-related files were removed. Native `android/` project is absent.

## User preferences & rules
- Continue the existing app; inspect current code and backend before changes, make targeted changes, preserve working features and existing data.
- Remove phone-number requirements and SMS verification from normal registration, login, and profile use.
- Never show users raw database IDs, UUIDs, storage keys, or long technical numbers in delete dialogs, alerts, notifications, or user-facing error messages.
- Use custom MingleNest delete confirmations, not browser pop-ups. Status dialog wording: “Delete this status?” / “Are you sure you want to delete this status? This action cannot be undone.” Buttons: “Cancel” and “Delete Status.” Cancel or outside click must not delete; delete only after confirmation.
- Use per-item delete controls for Profile Photos and Videos galleries. Confirm with “Delete this photo?” or “Delete this video?” and Cancel/Delete; Cancel must leave the item unchanged. Delete only the selected item and associated storage, using the existing ownership check.
- Use delete confirmations and buttons: “Delete this story?” / “Cancel” and “Delete story”; corresponding photo, video, post, and message wording.
- Preserve branding, languages, navigation, existing data and functionality unless explicitly requested. Keep credentials server-side.
- Do not change package ID or Supabase project, publish, push to GitHub, create another account system, or recreate `android/` without authorization.
- Keep normal Stories separate from Kids Stories; preserve approved Little moments behavior and chat read-state behavior.
- Do not create duplicate tables/features, delete or overwrite user data, or modify the database before reporting findings.
- For the Chats redesign, keep the existing MingleNest logo and colors; use reference image for layout only. Do not redesign unrelated screens.
- For the Chats correction, keep logo, original colors, and bottom navigation unchanged; make search field smaller, rounded, and contained in its card; align card text with consistent padding and reduce excess space.

## Open issues & next ideas
- Test username search and messaging with two real accounts and on Android.
- Verify phone-free account creation/use and confirm no normal flow requires SMS.
- Test unread/read behavior, voice completion tracking, real deletions, and user-facing messages.
- Verify per-item gallery deletion and associated storage cleanup, including photo storage.
- Older type warnings/errors remain in `App.tsx`, `StatusPanel.tsx`, and `i18n.tsx`; they were not addressed.
- Other pending checks: Profile media, Stories/Status, chat read-state, video, contacts, auth/uploads, password recovery, Google provider configuration, and `.aab` packaging.
- Visually verify Chats when preview can reach it; latest preview remained on sign-in.
