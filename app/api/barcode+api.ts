import { round1 } from '@/lib/macros';

interface BarcodeResult {
  found: boolean;
  name?: string;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  servingSizeG?: number | null;
  fiberPer100?: number | null;
  sugarPer100?: number | null;
  sodiumPer100?: number | null; // mg
  saturatedFatPer100?: number | null;
  cholesterolPer100?: number | null; // mg
}

function parseServingSize(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const match = raw.match(/([\d.]+)\s*g\b/i);
  return match ? Number(match[1]) : null;
}

// Open Food Facts is a free, keyless, community-maintained product database -
// no API key needed. https://world.openfoodfacts.org
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'Missing "code" query param.' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
      headers: { 'User-Agent': 'SimpleMacros/1.0 (personal use)' },
    });

    if (!response.ok) {
      return Response.json({ error: 'Barcode lookup failed.' }, { status: 502 });
    }

    const json = await response.json();

    if (json.status !== 1 || !json.product) {
      return Response.json({ found: false } satisfies BarcodeResult);
    }

    const product = json.product;
    const n = product.nutriments ?? {};
    const caloriesPer100 = n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / 4.184 : null);

    if (caloriesPer100 == null) {
      // Product exists but has no usable nutrition data.
      return Response.json({ found: false } satisfies BarcodeResult);
    }

    // Open Food Facts stores sodium/cholesterol in grams per 100g;
    // nutrition labels conventionally show them in milligrams.
    const toMg = (v: unknown) => (typeof v === 'number' ? round1(v * 1000) : null);

    const result: BarcodeResult = {
      found: true,
      name: product.product_name || product.generic_name || 'Unknown product',
      caloriesPer100: Math.round(caloriesPer100),
      proteinPer100: round1(n['proteins_100g'] ?? 0),
      carbsPer100: round1(n['carbohydrates_100g'] ?? 0),
      fatPer100: round1(n['fat_100g'] ?? 0),
      servingSizeG: parseServingSize(product.serving_size),
      fiberPer100: typeof n['fiber_100g'] === 'number' ? round1(n['fiber_100g']) : null,
      sugarPer100: typeof n['sugars_100g'] === 'number' ? round1(n['sugars_100g']) : null,
      sodiumPer100: toMg(n['sodium_100g']),
      saturatedFatPer100: typeof n['saturated-fat_100g'] === 'number' ? round1(n['saturated-fat_100g']) : null,
      cholesterolPer100: toMg(n['cholesterol_100g']),
    };

    return Response.json(result);
  } catch (error) {
    console.error('barcode lookup failed', error);
    return Response.json({ error: 'Barcode lookup failed. Check your connection and try again.' }, { status: 502 });
  }
}
