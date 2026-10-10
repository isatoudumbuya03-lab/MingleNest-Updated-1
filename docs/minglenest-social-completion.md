# MingleNest social update

Existing Supabase project, account identity, Capacitor package ID, navigation, branding, Contacts, private messaging, voice code and SMS functions were retained. Nothing published or pushed.

## Implemented
- Existing post composer selects photos or videos. Videos retain original bytes, up to 100 MB, and use the private post-videos Storage bucket with authenticated viewing, owner-path upload/delete policies and signed playback URLs. MP4/WebM/MOV/3GP/M4V accepted; playback depends on device codecs. Feed and profile render video controls. Failed video publication keeps the draft and cleans up the uploaded object when possible. Owner deletion removes the post, then attempts storage cleanup; a cleanup failure is reported.
- Reuses posts, post_comments and story_comments. Adds video_path/video_url, parent_id/deleted_at, unique comment reactions and recipient-only social activity. Server-created activity links to the exact content/comment, including older content outside the initial feed.
- Shared comment component provides complete Unicode text, public avatars/usernames/profiles, timestamps, likes/unlikes, replies and counts. Refreshes while open. Own-comment deletion uses a checked server operation and a tombstone, preserving other people's replies; deleted text is replaced, not exposed in activity.
- Existing creation-time triggers force server timestamps and preserve created_at and ownership on updates. New video posts/replies do not send client creation times. Existing timezone formatter is reused. Historical timestamps were not rewritten.
- Existing Google/email gate, persistent session, contacts and chat/voice code are unchanged. Eight-language catalog extended; Arabic direction and copy/paste remain.

## Test boundaries
Source/syntax/Unicode/timezone tests and database schema/policy inspections do not constitute signed-in multi-user end-to-end tests. Google login, two-account like/reply/deletion/activity flows, real uploads/playback across codecs, offline failures, Android gallery selection and keyboard/copy/paste need real-account/device testing. Native android project is still missing and was not recreated; this update is not synced to an Android binary.

## Device checklist
1. Login/reopen with same account and confirm persistent session.
2. Upload MP4 from gallery, verify full date/time and original quality, reopen and replay.
3. With second account, like post/comment, unlike, reply with emoji/newlines. Confirm one reaction per user and full activity text opens exact comment.
4. Remove own reply; attempt another user's removal (must fail). Delete parent comment and verify other replies remain. Delete own video post and ensure unauthorized deletes fail.
5. Verify local timezone timestamps and unchanged historical creation time.
6. Regression: contact search/removal, private text/voice recording/preview/discard/send/playback, Stories interactions, Kids Stories, RTL and keyboard copy/paste.
