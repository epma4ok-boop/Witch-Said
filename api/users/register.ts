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

  let body: { telegram_id?: number; referred_by?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { telegram_id, referred_by } = body;
  if (!telegram_id) {
    return Response.json({ error: "missing telegram_id" }, { status: 400 });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    Prefer: "resolution=ignore-duplicates,return=minimal",
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      telegram_id,
      referred_by: referred_by || null,
    }),
  });

  const isNew = res.status === 201;
  return Response.json({ ok: true, isNew });
}
