import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

// Auth hooks use Standard Webhooks signatures, not user JWTs.
// Never log request bodies, phone numbers, OTPs, keys, or provider responses.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, webhook-id, webhook-timestamp, webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reply(status: number, message?: string) {
  return new Response(JSON.stringify(message
    ? { error: { http_code: status, message } }
    : {}), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, 'Method not allowed.');

  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  const apiKey = Deno.env.get('BIRD_API_KEY');
  const endpoint = 'https://eu1.platform.bird.com/v1/sms/messages';
  if (!hookSecret || !apiKey) return reply(503, 'SMS verification is not configured.');

  // Permit only Bird's regional SMS endpoint, avoiding accidental credential disclosure.
  let target: URL;
  try {
    target = new URL(endpoint);
    if (target.protocol !== 'https:' || !/^(?:[a-z]+\d+\.)?platform\.bird\.com$/.test(target.hostname)
        || target.pathname !== '/v1/sms/messages' || target.search || target.hash || target.username || target.password || target.port) {
      return reply(503, 'SMS provider configuration is invalid.');
    }
    if (apiKey.startsWith('bk_eu1_') && target.hostname !== 'eu1.platform.bird.com') {
      return reply(503, 'SMS provider region is invalid.');
    }
  } catch { return reply(503, 'SMS provider configuration is invalid.'); }

  let payload: { user?: { phone?: unknown }; sms?: { otp?: unknown } };
  try {
    const raw = await req.text();
    if (raw.length > 65536) return reply(413, 'Request too large.');
    const secret = hookSecret.replace(/^v1,whsec_/, '').replace(/^whsec_/, '');
    payload = new Webhook(secret).verify(raw, Object.fromEntries(req.headers)) as typeof payload;
  } catch { return reply(401, 'Invalid hook signature.'); }

  const phone = payload?.user?.phone;
  const otp = payload?.sms?.otp;
  if (typeof phone !== 'string' || typeof otp !== 'string' || !/^\+?[1-9]\d{6,14}$/.test(phone) || !/^\d{4,10}$/.test(otp)) {
    return reply(400, 'Invalid verification payload.');
  }
  try {
    const response = await fetch(target, {
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone.startsWith('+') ? phone : `+${phone}`,
        template: {
          slug: 'bird_otp_verification',
          parameters: { code: otp },
        },
      }),
      signal: AbortSignal.timeout(4500),
    });
    // Provider error details may contain private data; do not expose them.
    if (!response.ok) {
      await response.body?.cancel();
      return reply(502, 'Unable to send verification SMS. Please try again.');
    }
    await response.body?.cancel();
    return reply(200);
  } catch { return reply(502, 'Unable to send verification SMS. Please try again.'); }
});
