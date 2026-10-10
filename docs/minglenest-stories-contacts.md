# MingleNest Stories and contacts update

## Preserved
The existing Supabase project, Capacitor application ID, eight-language translation system, navigation and visual tokens are unchanged. Only new interface labels were added to the same dictionaries. Voice recording, timer, sending, playback, text messaging, posts and notifications have not been rewritten. No calling services were added.

## One account
App.tsx restores the singleton Supabase session and supplies authUser.id to Story interactions and private chat. Existing Auth triggers populate profiles and chat_users using that same UUID. Contacts uses that existing session; it never registers users. Gmail addresses work through the existing email/password signup, not a second Google account.

## Stories
The new story_reactions and story_comments tables reference the existing stories table. Both have RLS enabled; signed-in users read interactions and can insert/delete only their own rows. The unique reaction key prevents duplicate likes. Story creation now requires the existing session and reports failed backend saves rather than creating local-only success. Own Story deletion checks the backend before removing the UI entry. Comments resolve author names and avatars from profiles. Interaction counts/comments refresh every five seconds while the viewer is open and on focus. No demo interactions were inserted.

## Contacts privacy and limitations
The Find phone contacts button is explicit consent before the native Android permission request. Denial does not disable username search. The plugin reads names, emails and phone numbers only, after permission; it does not request photos or write contacts. Contacts are held in component memory, cleared when the chat screen unmounts, and never stored in the database or local storage.

The client sends SHA-256 digests rather than address-book names/raw emails/phone numbers. The authenticated discover_minglenest_contacts RPC returns public profile identity and matching digest only. Hashes are pseudonymous, NOT encryption: low-entropy numbers can be guessed. Do not describe them as anonymous. The RPC requires authentication and bounds request size; it must not be exposed to anonymous callers.

Matching uses verified Supabase Auth emails and, where present, verified Auth phone numbers. Local phone formats without international + prefix are intentionally not guessed. The existing email signup does not collect a verified phone, so phone-number-only contacts cannot match those email-only accounts. Contacts with their verified signup email can match immediately. Adding verified phone enrollment would be a separate authentication change and is not included. Unmatched contacts are labeled as no verified match, not falsely declared non-members. Invitations open the user's SMS/email composer with localized invitation text; the user chooses whether to send. No unpublished store link is invented.

## Android integration (existing native project)
The installed plugin is @capacitor-community/contacts 8.x. No Android source directory was present in this workspace, so no unrelated native scaffold was generated. In the existing Android project, run `yarn install` and `npx cap sync android` to register the plugin. Ensure android/app/src/main/AndroidManifest.xml contains `<uses-permission android:name="android.permission.READ_CONTACTS" />` as a direct manifest child. Do not add WRITE_CONTACTS permission. Keep applicationId com.minglenest.app and existing microphone/deep-link configuration unchanged. Rebuild your existing Android package for plugin changes to take effect; a web-only update cannot install a native plugin.

## Verification checklist
Use two existing confirmed accounts, not new chat accounts. Sign in once, open Chat, search the second account by username and message it. Create a real Story, like/unlike it from the other account, add comments, check author names/avatars, reopen and confirm persistence, delete an own comment, and ensure the other account cannot delete it. On Android, grant contacts permission and test a contact containing the other account's verified signup email; open the matched profile then chat. Deny permission and verify username search still works. Check an unmatched contact invitation opens the composer without sending automatically.

No real Android devices, contacts permission prompt, SMS composer, or two-account Story interaction testing was completed in this environment. Database schema/policies and browser rendering can be inspected here; physical-device permission and end-to-end persistence tests remain required.
