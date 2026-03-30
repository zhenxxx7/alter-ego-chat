import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, CardContent, Page, PageBody, PageHeader, PageTitle, Textarea, toast } from '@blinkdotnew/ui'
import { Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { blink } from '../../blink/client'
import { useAuth } from '../../hooks/useAuth'
import { buildOpeningMessage, toAiMessages } from './alterEgoPrompt'
import type { ChatMessage } from './types'

const DECISION_PLACEHOLDER = 'I chose engineering instead of pursuing music.'

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content }
}

export function AlterEgoChatPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [decision, setDecision] = useState('')
  const [draft, setDraft] = useState('')
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isReplying, setIsReplying] = useState(false)
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    document.title = 'Alter Ego Chat | Alternate Life AI'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', 'Talk to an alternate version of yourself shaped by the major life path you did not take.')
    }
  }, [])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isReplying])

  const canStart = decision.trim().length > 0
  const canSend = draft.trim().length > 0 && !isReplying && started && isAuthenticated

  const helperLabel = useMemo(() => {
    if (isLoading) return 'Checking session…'
    if (!started) return 'Start the conversation when the untaken path feels right.'
    if (!isAuthenticated) return 'Sign in to unlock AI replies from your alter ego.'
    return 'Ask about their work, love life, regrets, routines, or what they think of your current life.'
  }, [isAuthenticated, isLoading, started])

  const handleStart = () => {
    const trimmedDecision = decision.trim()
    if (!trimmedDecision) {
      toast.error('Describe the path you did not take first.')
      return
    }

    setStarted(true)
    setDecision(trimmedDecision)
    setMessages([createMessage('assistant', buildOpeningMessage(trimmedDecision))])
    setDraft('')
  }

  const handleReset = () => {
    setDecision('')
    setDraft('')
    setStarted(false)
    setMessages([])
    setIsReplying(false)
  }

  const handleSend = async () => {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || isReplying || !started) return

    if (!isAuthenticated) {
      blink.auth.login(window.location.href)
      return
    }

    const userMessage = createMessage('user', trimmedDraft)
    const assistantMessage = createMessage('assistant', '')
    const nextMessages = [...messages, userMessage]

    setDraft('')
    setIsReplying(true)
    setMessages([...nextMessages, assistantMessage])

    try {
      await blink.ai.streamText(
        {
          model: 'google/gemini-3-flash',
          messages: toAiMessages(decision, nextMessages),
          temperature: 0.9,
          maxTokens: 260,
        },
        (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          )
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach your alter ego right now.'
      const isAuthError = message.includes('401') || message.includes('Unauthorized')

      if (isAuthError) {
        blink.auth.login(window.location.href)
        return
      }

      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessage.id
            ? { ...entry, content: 'I lost the thread for a moment. Try asking me again.' }
            : entry,
        ),
      )
      toast.error('Reply failed', { description: message })
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <Page className="min-h-screen bg-background">
      <PageHeader className="mx-auto w-full max-w-4xl px-4 pb-6 pt-10 sm:px-6 lg:px-8">
        <div className="setup-shell w-full">
          <Badge variant="secondary" className="mb-4 w-fit border border-primary/15 bg-secondary text-secondary-foreground">
            Single-page alternate life chat
          </Badge>
          <PageTitle className="max-w-2xl font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Talk to the version of you who chose differently.
          </PageTitle>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Describe the fork in the road, then chat with the self who actually lived it.
          </p>
        </div>
      </PageHeader>

      <PageBody className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
        <Card className="setup-shell border-border/70 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="space-y-2">
              <label htmlFor="life-decision" className="text-sm font-medium text-foreground">
                Describe a major life decision and the path you didn&apos;t take
              </label>
              <Textarea
                id="life-decision"
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                placeholder={DECISION_PLACEHOLDER}
                className="min-h-[110px] resize-none border-border/70 bg-background/80 text-base"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{helperLabel}</p>
              <div className="flex flex-wrap gap-3">
                {started && (
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset &amp; Start New
                  </Button>
                )}
                <Button onClick={handleStart} disabled={!canStart} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Start Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {started && (
          <Card className="setup-shell overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-primary/5">
            <CardContent className="p-0">
              <div className="border-b border-border/70 px-5 py-4 sm:px-6">
                <p className="text-sm font-medium text-foreground">Alternate path</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{decision}</p>
              </div>

              <div className="max-h-[55vh] min-h-[320px] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-alter-ego'}
                    >
                      <p className="whitespace-pre-wrap leading-7">{message.content || (isReplying ? '...' : '')}</p>
                    </div>
                  </div>
                ))}

                {isLoading && !isAuthenticated && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-alter-ego inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Restoring your session…
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>

              {!isAuthenticated && !isLoading && (
                <div className="border-t border-border/70 bg-secondary/35 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Sign in to send messages and hear from this version of yourself.
                    </p>
                    <Button onClick={() => blink.auth.login(window.location.href)}>Continue to Sign In</Button>
                  </div>
                </div>
              )}

              <div className="border-t border-border/70 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask what their life became..."
                    className="min-h-[92px] resize-none border-border/70 bg-background/80"
                    disabled={!started || !isAuthenticated || isReplying}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend()
                      }
                    }}
                  />
                  <Button
                    onClick={() => void handleSend()}
                    disabled={!canSend}
                    className="h-auto min-h-[92px] min-w-[132px]"
                  >
                    {isReplying ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Replying
                      </span>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </Page>
  )
}
