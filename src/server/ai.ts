import { createServerFn } from "@tanstack/react-start";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_MODEL = "gemma-3-1b-it";

async function callLovable(key: string, messages: Array<{ role: string; content: string }>) {
  const res = await fetch(LOVABLE_GATEWAY, {
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

// Direct Google Generative Language API (Gemma 3 1B). Used as a Vercel-friendly
// fallback when LOVABLE_API_KEY is not provisioned (e.g. on a custom domain
// hosted outside Lovable Cloud).
async function callGemini(key: string, messages: Array<{ role: string; content: string }>) {
  // Gemma chat models on the v1beta API don't support a separate "system" role —
  // collapse any system messages into the first user turn.
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = messages.filter((m) => m.role !== "system");
  const contents = turns.map((m, i) => {
    const role = m.role === "assistant" ? "model" : "user";
    const text = i === 0 && sys ? `${sys}\n\n${m.content}` : m.content;
    return { role, parts: [{ text }] };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Gemini rate limit reached. Try again in a moment.");
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p: any) => p?.text ?? "").join("");
  return "";
}

async function callAI(messages: Array<{ role: string; content: string }>) {
  const lovable = process.env.LOVABLE_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  if (lovable) {
    try {
      return await callLovable(lovable, messages);
    } catch (err) {
      if (gemini) return await callGemini(gemini, messages);
      throw err;
    }
  }
  if (gemini) return await callGemini(gemini, messages);
  throw new Error("No AI key configured (LOVABLE_API_KEY or GEMINI_API_KEY).");
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
    // The client may inject a synthetic { role: "user", content: "::MEMORY::\n..." } as
    // the first message — extract it into the system prompt instead of leaving it visible.
    let memory = "";
    let msgs = data.messages;
    if (msgs.length && msgs[0].role === "user" && msgs[0].content.startsWith("::MEMORY::")) {
      memory = msgs[0].content.replace("::MEMORY::", "").trim();
      msgs = msgs.slice(1);
    }
    const sys = "You are a friendly study buddy AI. Help with studying, focus tips, explaining concepts. Keep replies concise and warm." +
      (memory ? `\n\nKnown facts about the user (use naturally if relevant, do not list them back):\n${memory}` : "");
    const reply = await callAI([
      { role: "system", content: sys },
      ...msgs,
    ]);
    return { reply };
  });
