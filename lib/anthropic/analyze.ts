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

const SYSTEM_PROMPT = `You are an experienced photographer and photo editor.
Analyze photographs with expertise in technical quality, composition, light, and emotional impact.
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
  "overall_rating": <number 1-10, one decimal>,
  "technical_rating": <number 1-10>,
  "composition_rating": <number 1-10>,
  "light_rating": <number 1-10>,
  "impact_rating": <number 1-10>,
  "print_rating": <number 1-10, suitability for large-format wall print>,
  "bw_rating": <number 1-10, suitability for B&W conversion>,
  "tier": "<A+|A|B|C>",
  "critique": "A detailed critique covering: technical quality (sharpness, exposure, noise), composition (leading lines, foreground interest, layering), light quality and direction, subject strength, emotional impact, and print potential. Be direct and specific. 150-250 words.",
  "crop_suggestion": "Specific crop or edit recommendations to strengthen the image. If no changes needed, say so. 50-100 words.",
  "bw_rationale": "Why this image would or would not work well as a B&W conversion. Reference specific tonal relationships, textures, or compositional elements. 50-75 words.",
  "tags": ["tag1", "tag2", ...]
}

Tier definitions:
- A+: Wall-print worthy. Technically excellent, compositionally strong, distinctive light or subject. Would stand alone in a fine art gallery.
- A: Gallery-quality. Good technically and compositionally but missing one key element (light, foreground, decisive moment). Worth including in a curated set.
- B: Documentary or personal value only. Technical or compositional issues prevent gallery use.
- C: Reject. Multiple technical deficiencies`
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
