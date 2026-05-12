export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return Response.json({ bonus: 0, note: "no_db" });
  }

  const url = new URL(req.url);
  const telegram_id = url.searchParams.get("telegram_id");
  if (!telegram_id) {
    return Response.json({ error: "missing telegram_id" }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}&select=bonus_predictions`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    },
  );

  const rows = (await res.json()) as Array<{ bonus_predictions: number }>;
  const bonus = rows[0]?.bonus_predictions ?? 0;

  // After reading, reset to 0 so bonus isn't applied twice
  if (bonus > 0) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegram_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ bonus_predictions: 0 }),
      },
    );
  }

  return Response.json({ bonus });
}
