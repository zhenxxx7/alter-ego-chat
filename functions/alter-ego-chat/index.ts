import { createClient } from "npm:@blinkdotnew/sdk"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function buildSystemPrompt(decision: string) {
  return `You are the user's alter ego: the version of them who fully lived the path described here: "${decision}".

Stay fully in character at all times.
Speak in first person as this alternate self.
Reference the alternate career, daily routines, sacrifices, relationships, regrets, wins, and turning points that came from that path.
Be specific, reflective, and conversational instead of abstract or generic.
Do not say you are an AI, assistant, language model, simulation, or roleplaying.
Do not break character.
If the user asks about differences between lives, answer from your lived perspective and compare naturally.
Keep replies concise but vivid, usually 90 to 180 words.`
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const { decision, messages, streaming = false } = await req.json()

    if (!decision || typeof decision !== "string") {
      return new Response(JSON.stringify({ error: "decision is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const secretKey = Deno.env.get("BLINK_SECRET_KEY")!
    const projectId = Deno.env.get("BLINK_PROJECT_ID")!

    const blink = createClient({
      projectId,
      secretKey,
    })

    // The Blink AI backend requires at least one non-system message (user/model turns).
    // We prepend a synthetic user message so system-only first-turns work.
    const hasUserMessage = Array.isArray(messages) && messages.some((m) => m.role === "user")
    const seedUserMessage = hasUserMessage
      ? null
      : { role: "user" as const, content: "I'm here. Tell me about your life." }

    const aiMessages = [
      { role: "system" as const, content: buildSystemPrompt(decision) },
      seedUserMessage,
      ...(Array.isArray(messages) ? messages : []),
    ].filter(Boolean) as { role: string; content: string }[]

    if (streaming) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await blink.ai.streamText(
              {
                model: "google/gemini-3-flash",
                messages: aiMessages,
                temperature: 0.9,
                maxTokens: 260,
              },
              (chunk: string) => {
                controller.enqueue(encoder.encode(chunk))
              },
            )
          } catch (err) {
            console.error("STREAM ERROR:", err)
            controller.enqueue(encoder.encode(`[ERROR:${err instanceof Error ? err.message : "unknown"}]`))
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      })
    } else {
      // Non-streaming: raw fetch without empty "prompt" field
      const rawResp = await fetch(
        `https://core.blink.new/api/ai/${projectId}/text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${secretKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash",
            messages: aiMessages,
            temperature: 0.9,
            maxTokens: 260,
          }),
        },
      )

      const rawData = await rawResp.json()
      if (!rawResp.ok) {
        throw new Error(rawData.error?.message || `HTTP ${rawResp.status}`)
      }

      const text = rawData.text || ""

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
