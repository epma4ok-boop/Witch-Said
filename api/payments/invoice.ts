export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return Response.json(
      { error: "Bot not configured. Add BOT_TOKEN to Vercel environment variables." },
      { status: 503 },
    );
  }

  try {
    const payload = `predictions_3_${Date.now()}`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Witch Said — Предсказания",
          description:
            "+3 предсказания (по 1 на каждую тему: Любовь, Работа, Деньги)",
          payload,
          currency: "XTR",
          prices: [{ label: "3 Predictions", amount: 1 }],
        }),
      },
    );

    const data = (await tgRes.json()) as { ok: boolean; result?: string; description?: string };

    if (!data.ok) {
      return Response.json(
        { error: `Telegram error: ${data.description ?? "unknown"}` },
        { status: 500 },
      );
    }

    return Response.json({
      invoiceLink: data.result,
      starsAmount: 1,
      predictionsAmount: 3,
    });
  } catch (err) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
