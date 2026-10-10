# MingleNest Send SMS Hook

Deployed endpoint:
https://amljaleklvaawyyqauyl.supabase.co/functions/v1/send-sms

Only the Edge Function was added. Existing accounts and app features are unchanged.

## Required Edge Function secrets

Add these in Cloud → Secrets (they sync to this Supabase project):

- `BIRD_API_KEY`: your existing Bird SMS API key; never put it in frontend environment variables.
- `BIRD_SMS_SENDER`: a Bird-approved sender/originator for your destination countries (for example `MingleNest` only if approved).
- `SEND_SMS_HOOK_SECRET`: the signing secret from Supabase Authentication → Hooks → Send SMS. Store the complete `v1,whsec_...` value.

Optional:

- `BIRD_SMS_API_URL`: defaults to `https://eu1.platform.bird.com/v1/sms/messages`. Set Bird's correct regional endpoint if the key is not EU. Only HTTPS Bird regional hosts with `/v1/sms/messages` are accepted. EU-prefixed keys must use the EU host.

Deployment confirmed only `GEMINI_API_KEY` available; none of the required SMS secrets were present. The function therefore currently fails closed with HTTP 503, and SMS delivery is NOT confirmed.

## Hook configuration

In the existing Supabase project, Authentication → Hooks → Send SMS:

1. Select an HTTP hook and enter the endpoint above.
2. Generate/use the hook signing secret; save that exact secret as `SEND_SMS_HOOK_SECRET`.
3. Enable the hook and ensure phone verification is enabled for the existing authentication flow.

JWT verification is disabled for this endpoint because Supabase Auth hooks authenticate with Standard Webhooks signatures instead. The function verifies the original raw body and signed timestamp/headers before sending anything to Bird. Do not use the anon key or service-role key as the hook secret.

## SMS behavior

The verified hook payload supplies `user.phone` and `sms.otp`. The function sends Bird a Bearer-authenticated POST with `to`, `from`, `text`, and `category: authentication`. Message: `Your MingleNest verification code is <otp>.` A successful Bird response returns `{}` with HTTP 200. No keys, OTPs, phone numbers, provider responses, or request bodies are logged. Provider failures return only a generic error.

## Remaining verification

After secrets and hook configuration are in place, request phone verification through the existing signed-in profile flow, receive the SMS, and confirm the code. Test a valid signed hook and tampered/expired signatures. Real SMS delivery cannot be tested without the Bird key, approved sender, hook secret, and a receiving phone; an unsigned request must never send an SMS.
