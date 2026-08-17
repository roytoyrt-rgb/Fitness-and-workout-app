export async function GET(): Promise<Response> {
  return Response.json({ aiConfigured: !!process.env.ANTHROPIC_API_KEY });
}
