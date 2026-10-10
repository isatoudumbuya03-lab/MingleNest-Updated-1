# Chat → Add Contact

The existing Chat screen now opens a contacts menu. Username search reads only public profile fields. Verified-phone search and phone-address-book discovery reuse the existing authenticated, rate-limited hashed-phone RPC. No secondary authentication or chat identity is introduced.

Saved relationships live in public.user_contacts. Composite primary key prevents duplicates. Owner-only SELECT, INSERT and DELETE policies use auth.uid(); no UPDATE policy, no anonymous grants and no authenticated TRUNCATE privileges. Removing a relationship never deletes conversations or messages.

Profile → Message calls the existing onChat handler and existing private conversation lookup. Phone numbers are never rendered in results or profiles. Address-book reads require the native Contacts permission grant. Invitations use Capacitor Share on Android and never automatically send an SMS. Browser invitations use Web Share or copy as fallback.

All new interface text is included in the existing eight-language catalog. Existing design, Android application ID, authentication, voice-message implementation and SMS hook are unchanged.

## Verification

- `yarn test:contacts`: 13 international normalization/hash assertions (Gambia, US, UK, France, Germany, China and Arabic digits).
- `node scripts/check-translations.cjs`: eight-language catalog/interface checks.
- `node scripts/test-saved-contacts.cjs`: permission/discovery/ownership/share invariants and real anonymous access rejection.
- Live database inspection: RLS enabled; owner-only policies; unique relationship and authenticated-user foreign keys.

## Required device acceptance test

This workspace has no Android native project and no signed-in two-account test sessions. The native Android permission dialog, sharing and two-account flow cannot be tested here. Sync the existing Android project with the updated dependencies using the existing Capacitor workflow; the existing after-sync contacts hook preserves the application ID and adds READ_CONTACTS. Capacitor Share must be included by sync.

1. With two existing MingleNest accounts, verify account A's phone via the existing Profile flow.
2. Sign in as B. Chat → Add Contact → search A's username → Add Contact → confirm Added and saved Contacts entry.
3. Open the saved profile → Message; send a message using the existing conversation.
4. Remove the saved contact; confirm the conversation and its messages remain available.
5. Save A's verified phone in Android Contacts. Grant READ_CONTACTS and repeat discovery/add/profile/message.
6. Deny permission and verify username search still works.
7. Select the right country for local-format numbers; international + numbers work independently of that selection.
8. Invite an unmatched phone contact; confirm the Android share sheet appears and nothing sends until the user chooses an app and confirms.
9. Confirm results and profiles never display another user's phone number.

Phone verification depends on the previously configured Supabase Send SMS Hook and Bird settings; this update does not modify them.
