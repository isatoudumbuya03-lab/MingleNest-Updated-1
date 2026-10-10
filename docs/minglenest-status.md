# MingleNest Status

Status is an additive section at the top of the existing Stories screen. Existing Stories are unchanged. It uses the existing signed-in Supabase user, theme, timestamp formatter, languages and navigation.

## Changes
- Photo, original-file video (up to 100 MB), and text Status, with captions, native Unicode emoji and copy/paste.
- Private `status-media` Storage bucket; authenticated owner upload/delete and active-Status media reads. Owners retain access to their own files for cleanup. Other users receive short-lived signed URLs limited to the remaining Status lifetime (maximum five minutes).
- Separate Status tables only: updates, unique views, unique per-user reactions, comments, recipient-private activity. RLS and server-controlled creation time/24-hour expiry. No update policies permit timestamp editing.
- Own Status deletion and own reply deletion. Viewing users and count visible to Status owner. Reactions and replies visible to signed-in users, matching Status audience.
- Replies/reactions generate in-app Status activity; tapping opens the corresponding active Status. No native push notifications were added. Polling updates lists every 30 seconds, open interactions every 10 seconds. Local expiry closes the viewer and removes expired cards; database access also enforces expiry independently.
- Expiry hides Status and disables discovery/interactions after 24 hours; it is not a physical purge of expired database rows or original Storage files. Previously downloaded media cannot be revoked.
- Existing posts, contacts, chats, comments, Kids Stories, auth, SMS and package configuration are not replaced or modified.

## Checks and device requirements
Run `node scripts/test-status.cjs` and existing social/contact/translation checks. These check syntax and source/migration wiring, not two-person authenticated end-to-end behavior. Database inspection confirms RLS, triggers, policies and private bucket configuration.

Use two existing accounts on real devices to verify gallery selection, uploads, video codec support/playback, emoji and paste, unique views, reactions, full replies, activity links, owner-only deletion, cross-user rejection, timezone display and 24-hour expiration. Test offline/upload failures as well. Native Android source remains absent; no Android packaging or native sync was performed. Nothing was published or pushed.
