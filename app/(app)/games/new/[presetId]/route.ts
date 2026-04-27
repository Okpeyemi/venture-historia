import { createGameAction } from "../../actions";

export async function POST(
  _request: Request,
  context: { params: Promise<{ presetId: string }> },
): Promise<Response> {
  const { presetId } = await context.params;
  // createGameAction throws redirect() — Next handles the response.
  await createGameAction(presetId);
  // Unreachable (createGameAction redirects), but keeps TS happy.
  return new Response(null, { status: 303 });
}
