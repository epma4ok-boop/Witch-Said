export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return Response.json({ ok: true, note: "no_db" });
  }

  let body: { telegram_id?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { telegram_id } = body;
  if (!telegram_id) {
    return Response.json({ error: "missing telegram_id" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // 1. Fetch this user to find their referrer
  const userRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}&select=referred_by,first_prediction_at`,
    { headers },
  );
  const users = (await userRes.json()) as Array<{
    referred_by: number | null;
    first_prediction_at: string | null;
  }>;

  const user = users[0];
  if (!user) return Response.json({ ok: true, note: "user_not_found" });
  if (user.first_prediction_at) return Response.json({ ok: true, note: "already_done" });

  // 2. Mark first_prediction_at
  await fetch(
    `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}`,
    {
      method: "PATCH",
      headers: {
        ...headers,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ first_prediction_at: new Date().toISOString() }),
    },
  );

  // 3. If referred_by exists — reward referrer with +1 bonus prediction
  if (user.referred_by) {
    // Get current bonus
    const refRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${user.referred_by}&select=bonus_predictions`,
      { headers },
    );
    const refs = (await refRes.json()) as Array<{ bonus_predictions: number }>;
    const currentBonus = refs[0]?.bonus_predictions ?? 0;

    await fetch(
      `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${user.referred_by}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ bonus_predictions: currentBonus + 1 }),
      },
    );
  }

  return Response.json({ ok: true, rewarded: !!user.referred_by });
}
