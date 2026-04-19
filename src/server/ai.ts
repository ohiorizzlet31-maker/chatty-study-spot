import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(messages: Array<{ role: string; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace.");
    throw new Error(`AI error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export const translateMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; target: string }) => {
    if (!input?.text || !input?.target) throw new Error("Missing fields");
    if (input.text.length > 2000) throw new Error("Too long");
    return input;
  })
  .handler(async ({ data }) => {
    const content = await callAI([
      { role: "system", content: `You are a translator. Translate the user's text into ${data.target}. Reply ONLY with the translation, no quotes, no extra commentary.` },
      { role: "user", content: data.text },
    ]);
    return { translation: content.trim() };
  });

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: Array<{ role: "user" | "assistant"; content: string }> }) => {
    if (!Array.isArray(input?.messages)) throw new Error("Missing messages");
    if (input.messages.length > 50) throw new Error("Too many messages");
    return input;
  })
  .handler(async ({ data }) => {
    const reply = await callAI([
      { role: "system", content: "You are a friendly study buddy AI. Help with studying, focus tips, explaining concepts. Keep replies concise and warm." },
      ...data.messages,
    ]);
    return { reply };
  });
