import { callClaude, extractJson, ClaudeConfigError } from '@/lib/claude';

interface RequestBody {
  images: { base64: string; mediaType: string }[];
}

interface IngredientsResult {
  ingredients: string[];
}

const SYSTEM_PROMPT = `You identify food ingredients from photos for a home cook. Look at the image(s) and list every distinct food ingredient you can see (proteins, vegetables, grains, dairy, pantry items, etc). Ignore packaging, brand names, and non-food items. Be specific but simple (e.g. "chicken breast" not "raw poultry protein"). Respond with ONLY compact JSON matching this exact shape, no other text: {"ingredients": string[]}`;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.images?.length) {
      return Response.json({ error: 'At least one image is required.' }, { status: 400 });
    }

    const content = [
      { type: 'text' as const, text: 'Identify the ingredients visible in these photos.' },
      ...body.images.map((img) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
      })),
    ];

    const text = await callClaude({ system: SYSTEM_PROMPT, content, maxTokens: 1024 });
    const result = extractJson<IngredientsResult>(text);

    return Response.json(result);
  } catch (error) {
    if (error instanceof ClaudeConfigError) {
      return Response.json({ error: error.message }, { status: 501 });
    }
    console.error('identify-ingredients failed', error);
    return Response.json({ error: 'Failed to identify ingredients. Please try again.' }, { status: 500 });
  }
}
