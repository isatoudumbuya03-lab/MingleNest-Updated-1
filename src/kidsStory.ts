export type StoryRequest = { child: string; age: string; topic: string }
export type StoryResult = { title: string; text: string }

// The browser calls our Edge Function; GEMINI_API_KEY is read only on the server.
const storyEndpoint = 'https://amljaleklvaawyyqauyl.supabase.co/functions/v1/generate-kids-story'

export async function generateKidsStory(request: StoryRequest): Promise<StoryResult> {
  let response: Response
  try {
    response = await fetch(storyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error('Could not connect to story generation. Please try again.')
  }

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
      ? result.error
      : 'Story generation is unavailable right now. Please try again.'
    throw new Error(message)
  }
  if (!result || typeof result !== 'object' || !('title' in result) || !('text' in result) || typeof result.title !== 'string' || typeof result.text !== 'string' || !result.title.trim() || !result.text.trim()) {
    throw new Error('The story could not be completed. Please try again.')
  }
  return { title: result.title, text: result.text }
}
