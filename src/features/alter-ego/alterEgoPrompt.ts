import type { ChatMessage } from './types'

export function buildSystemPrompt(decision: string) {
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

export function buildOpeningMessage(decision: string) {
  return `I took that road. ${decision} changed everything for me. Ask me what this life became, what it cost, or what still haunts me.`
}

export function toAiMessages(decision: string, messages: ChatMessage[]) {
  return [
    { role: 'system' as const, content: buildSystemPrompt(decision) },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ]
}
