import Anthropic from '@anthropic-ai/sdk'

export interface AnalysisResult {
  title: string
  caption: string
  curator_score: number
  stranger_score: number
  social_score: number
  overall_rating: number
  technical_rating: number
  composition_rating: number
  light_rating: number
  impact_rating: number
  print_rating: number
  bw_rating: number
  tier: 'A+' | 'A' | 'B' | 'C'
  critique: string
  crop_suggestion: string
  bw_rationale: string
  tags: string[]
}

export type CollectionType = 'nature trip' | 'city trip' | 'sports' | 'social event'

const SYSTEM_PROMPT = `You are rating photographs through three lenses simultaneously, then combining them. Imagine three judges:
1. The Gallery Curator — would this hang on a wall? Looks for composition, light, mood, intentionality, timelessness.
2. The Stranger Scrolling — would someone who doesn't know the subject stop, look, and react? Looks for stopping power, emotion, beauty, novelty.
3. The Social Editor — would this earn organic likes and comments on Instagram or Facebook? Looks for visual punch at thumbnail size, color, clear subject, shareable feeling.

Score each lens 1–10, then combine them into an overall score weighted equally. A great photo scores well across all three; a "nice memory" scores low on judges 1 and 2 even if a friend would like it.

Be honest and discerning — most photos people take are 4–6. Reserve 8+ for genuinely strong work.
`

const COLLECTION_TYPE_INTROS: Record<CollectionType, string> = {
  'nature trip': 'Analyze this photograph as an expert landscape photographer and photo editor',
  'city trip': 'Analyze this photograph as an expert travel and street photographer and photo editor',
  'sports': 'Analyze this photograph as an expert sports photographer and photo editor',
  'social event': 'Analyze this photograph as an expert event photographer and photo editor',
}

function buildUserPrompt(collectionType: CollectionType): string {
  const intro = COLLECTION_TYPE_INTROS[collectionType]
  return `${intro}.
Return a JSON object with the following fields:

{
  "title": "A short evocative title for the photo (5 words max)",
  "caption": "A descriptive caption suitable for a gallery (1-2 sentences)",
  "curator_score": <number 1-10, Gallery Curator judge score>,
  "stranger_score": <number 1-10, Stranger Scrolling judge score>,
  "social_score": <number 1-10, Social Editor judge score>,
  "overall_rating": <number 1-10, one decimal, equal-weighted average of the three judge scores>,
  "technical_rating": <number 1-10>,
  "composition_rating": <number 1-10>,
  "light_rating": <number 1-10>,
  "impact_rating": <number 1-10>,
  "print_rating": <number 1-10, suitability for large-format wall print>,
  "bw_rating": <number 1-10, suitability for B&W conversion>,
  "tier": "<A+|A|B|C>",
  "critique": "A detailed critique covering: technical quality (sharpness, exposure, noise), composition (leading lines, foreground interest, layering), light quality and direction, subject strength, emotional impact, and print potential. Reference how the three judges would each respond. Be direct and specific. 150-250 words.",
  "crop_suggestion": "Specific crop or edit recommendations to strengthen the image. If no changes needed, say so. 50-100 words.",
  "bw_rationale": "Why this image would or would not work well as a B&W conversion. Reference specific tonal relationships, textures, or compositional elements. 50-75 words.",
  "tags": ["tag1", "tag2", ...]
}

Tier definitions:
- A+: Top-of-portfolio. Scores well across all three judges — gallery, stranger, and social. Make this rare; truly exceptional photos only.
- A: Strong across most lenses. One judge would hesitate but the other two agree it's worth keeping. Worth including in a best-of selection for someone who appreciates the genre.
- B: Personal or documentary value only. Low on stranger and social scores even if technically decent. "Nice memory" territory.
- C: Reject. Technical deficiencies (blur, exposure, noise) or weak composition that even context can't save.`
}

export async function analyzePhoto(
  imageBase64: string,
  collectionType: CollectionType = 'nature trip'
): Promise<AnalysisResult> {
  const client = new Anthropic()
  const userPrompt = buildUserPrompt(collectionType)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  })

  // Extract JSON from response
  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }

  const result = JSON.parse(jsonMatch[0]) as AnalysisResult
  // Coerce judge scores to numbers in case Claude returns strings, then validate
  ;(['curator_score', 'stranger_score', 'social_score'] as const).forEach(k => {
    result[k] = Number(result[k])
  })
  if (isNaN(result.curator_score) || isNaN(result.stranger_score) || isNaN(result.social_score)) {
    throw new Error('Claude response missing required judge scores (curator_score, stranger_score, social_score)')
  }
  // Clamp to valid range in case Claude drifts slightly out of bounds
  ;(['curator_score', 'stranger_score', 'social_score'] as const).forEach(k => {
    result[k] = Math.min(10, Math.max(1, result[k]))
  })
  // Recompute overall_rating from the validated judge scores so it can't be fabricated
  result.overall_rating = Math.round(
    ((result.curator_score + result.stranger_score + result.social_score) / 3) * 10
  ) / 10
  return result
}
