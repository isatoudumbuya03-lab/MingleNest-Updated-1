const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid request' }, 400) }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 500) return json({ error: 'Describe the image in up to 500 characters.' }, 400)
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ error: 'AI images are unavailable right now.' }, 503)
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Create a friendly, safe, family-appropriate image: ${prompt}` }] }] }),
  }).catch(() => null)
  if (!response || !response.ok) return json({ error: 'The image could not be created. Please try again.' }, 502)
  const result = await response.json().catch(() => null)
  const parts = result?.candidates?.[0]?.content?.parts
  const image = Array.isArray(parts) ? parts.find((part: Record<string, unknown>) => part.inlineData || part.inline_data) : null
  const data = image?.inlineData || image?.inline_data
  if (!data?.data) return json({ error: 'No image was returned. Try a different description.' }, 502)
  return json({ image: data.data, mimeType: data.mimeType || data.mime_type || 'image/png' })
})
