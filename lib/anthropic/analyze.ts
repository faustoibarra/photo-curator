import Anthropic from '@anthropic-ai/sdk'

export interface AnalysisResult {
  title: string
  caption: string
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

const SYSTEM_PROMPT = `You are a senior photo editor at a serious publication and a gallery curator with decades of experience selecting work for exhibition. You have an unsparing eye and genuine taste. You do not flatter mediocre work. You grade against the published standard of the genre, not against the batch being analyzed.`

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
  "overall_rating": <number 1-10, one decimal. Calibrate against the published standard of the genre, not against the batch. 10 = canonical, career-defining work. 9 = exceptional, accepted by a serious gallery or magazine without hesitation. 8 = strong, publishable, one notable limitation. 7 = above average, real idea but execution fell short in one meaningful way. 6 = competent, no distinctive vision or moment. 5 = mediocre, forgettable. 4 and below = meaningful technical or compositional failures. Resist the pull toward the middle. A 6 should feel like mild disappointment, not a compliment.>,
  "technical_rating": <number 1-10>,
  "composition_rating": <number 1-10>,
  "light_rating": <number 1-10>,
  "impact_rating": <number 1-10>,
  "print_rating": <number 1-10, suitability for large-format wall print>,
  "bw_rating": <number 1-10, suitability for B&W conversion>,
  "tier": "<A+|A|B|C. A+ = print it large and hang it — technically excellent, compositionally decisive, light that couldn't be planned. Fewer than 1 in 50 shots earns this. A = gallery-ready within a curated set, strong on at least two of three: technical quality, composition, light. B = keep for documentation or personal memory, not for showing — has one meaningful failure. C = delete: multiple failures, or one fatal one. Do not use B as a default hedge. If unsure between B and C, ask whether you would show this photo to someone whose opinion you respect.>",
  "critique": "A critique that reads like it's from a senior photo editor deciding whether to publish this, or a curator deciding whether to hang it. Start with what the photograph is doing — its central argument or moment — before addressing anything technical. Then: what is the single strongest element, and what is the single biggest limitation keeping it from being exceptional? Name technical issues only when they undermine the image's intent. Close with one concrete thing the photographer could have done differently in the field — in framing, timing, light choice, or positioning — to get a stronger version of this shot. Write no more than 200 words. Say what needs saying, then stop.",
  "crop_suggestion": "Specific crop or edit recommendations to strengthen the image. If no changes needed, say so. 50-100 words.",
  "bw_rationale": "Why this image would or would not work well as a B&W conversion. Reference specific tonal relationships, textures, or compositional elements. 50-75 words.",
  "tags": ["tag1", "tag2", ...]
}

Return only the JSON object. No commentary before or after.`
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
  return result
}
