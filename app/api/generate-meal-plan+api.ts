import { callClaude, extractJson, ClaudeConfigError } from '@/lib/claude';
import type { MealSlot } from '@/lib/types';

interface RequestBody {
  ingredients: string[];
  goals: { calories: number; protein: number; carbs: number; fat: number };
}

interface GeneratedMeal {
  dayOfWeek: number;
  mealSlot: MealSlot;
  title: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealPlanResult {
  meals: GeneratedMeal[];
}

const SYSTEM_PROMPT = `You are a meal planner for someone who wants food to be as simple and low-effort as possible while hitting a high-protein diet. Build a 7-day meal plan (breakfast, lunch, dinner, snack for each of the 7 days = 28 meals total, dayOfWeek 0=Monday..6=Sunday).

Rules:
- Prioritize the ingredients the user has on hand (given in the prompt). You may add a small number of common pantry staples (salt, oil, spices, rice, eggs) if needed, but keep each meal to 5 ingredients or fewer.
- Every meal must be simple: 3 steps or fewer, minimal prep, common cooking methods (bake, pan-sear, boil, microwave, no-cook).
- Prioritize protein. Each meal should be meaningfully high in protein relative to its calories.
- Reuse ingredients across meals during the week so the user doesn't need to buy dozens of items and nothing goes to waste.
- Daily totals across the 4 meals should land close to the user's daily targets (given in the prompt), within about 10%.
- Vary meals across the week - don't repeat the exact same meal more than twice.

Respond with ONLY compact JSON matching this exact shape, no other text, no markdown fences:
{"meals": [{"dayOfWeek": number, "mealSlot": "breakfast"|"lunch"|"dinner"|"snack", "title": string, "ingredients": string[], "steps": string[], "calories": number, "protein": number, "carbs": number, "fat": number}]}`;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.ingredients?.length) {
      return Response.json({ error: 'At least one ingredient is required.' }, { status: 400 });
    }

    const userPrompt = [
      `Ingredients on hand: ${body.ingredients.join(', ')}.`,
      `Daily targets: ${body.goals.calories} calories, ${body.goals.protein}g protein, ${body.goals.carbs}g carbs, ${body.goals.fat}g fat.`,
      'Build the 7-day, 28-meal plan now.',
    ].join('\n');

    const text = await callClaude({
      system: SYSTEM_PROMPT,
      content: [{ type: 'text', text: userPrompt }],
      maxTokens: 4096,
    });

    const result = extractJson<MealPlanResult>(text);

    if (!Array.isArray(result.meals) || result.meals.length === 0) {
      throw new Error('Model returned an empty plan.');
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof ClaudeConfigError) {
      return Response.json({ error: error.message }, { status: 501 });
    }
    console.error('generate-meal-plan failed', error);
    return Response.json({ error: 'Failed to generate a meal plan. Please try again.' }, { status: 500 });
  }
}
