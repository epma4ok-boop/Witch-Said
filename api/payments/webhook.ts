export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;

  try {
    const update = (await req.json()) as {
      pre_checkout_query?: { id: string; from: { id: number } };
      message?: {
        successful_payment?: { invoice_payload: string };
      };
    };

    // ОБЯЗАТЕЛЬНО: ответить на pre_checkout_query в течение 10 секунд
    if (update.pre_checkout_query && BOT_TOKEN) {
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: update.pre_checkout_query.id,
            ok: true,
          }),
        },
      );
    }

    // successful_payment обрабатывается на клиенте через tg.openInvoice callback
    // Здесь можно добавить запись в БД если понадобится

    return Response.json({ ok: true });
  } catch {
    // Telegram требует 200 всегда, иначе будет повторять запросы
    return Response.json({ ok: true });
  }
}
