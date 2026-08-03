"use client";

/**
 * Journey GPT — right-side chat panel that describes and iterates on a journey.
 *
 * Mirrors Command's layout:
 *   - Header:  History icon · "Journey GPT" · green status dot · X (close)
 *   - Empty state: Sparkles avatar · heading · description · 4 suggestion chips
 *   - Message list (once user starts chatting) — assistant + user turns
 *   - Footer: multi-line textarea with an expand icon + send button, and a
 *     "Journey GPT can make mistakes" disclaimer below
 *
 * The panel is a prototype stub — send() appends a canned assistant reply.
 * A real implementation would stream tool-calls that mutate the canvas.
 */

import * as React from "react";
import {
  Expand,
  History,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Build a 3-step reminder when a payment is missed by more than 30 days",
  "Send an email, then SMS after 2 days if no opens",
  "Branch on DPD: > 60 days goes to AI call, else email",
  "Wait for payment_received within 7 days, exit if it happens",
];

interface JourneyGPTMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface JourneyGPTPanelProps {
  open: boolean;
  onClose: () => void;
}

export function JourneyGPTPanel({ open, onClose }: JourneyGPTPanelProps) {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<JourneyGPTMessage[]>([]);
  const [sending, setSending] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const seqRef = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const nextId = () => {
    seqRef.current += 1;
    return `m${seqRef.current}`;
  };

  const send = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setMessages((cur) => [...cur, { id: nextId(), role: "user", text: value }]);
    setInput("");
    setSending(true);
    window.setTimeout(() => {
      setMessages((cur) => [
        ...cur,
        {
          id: nextId(),
          role: "assistant",
          text: `I'll build that. Adding the required nodes to the canvas — you'll see them appear now. (Prototype stub — a real Journey GPT would emit tool-calls that mutate the canvas.)`,
        },
      ]);
      setSending(false);
    }, 700);
  };

  if (!open) return null;

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            title="Chat history (prototype)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <h3 className="whitespace-nowrap text-sm font-semibold text-foreground">Journey GPT</h3>
            <span
              className="ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400"
              title="Online"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close Journey GPT"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body — empty state or message list */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-4 pt-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-foreground">
                Describe the journey you want
              </h4>
              <p className="max-w-[320px] text-[12px] leading-relaxed text-muted-foreground">
                Journey GPT will build the nodes &amp; connections on the canvas. You can
                iterate by chatting — &quot;add an SMS step&quot;, &quot;remove the wait&quot;,
                &quot;branch on DPD &gt; 60&quot;.
              </p>
            </div>
            <div className="mt-2 flex w-full flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-left text-[12px] text-foreground transition-colors hover:border-violet-500/40 hover:bg-violet-500/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed",
                  m.role === "user"
                    ? "self-end bg-primary/15 text-foreground"
                    : "self-start border border-border bg-muted/30 text-foreground",
                )}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                    <Sparkles className="h-3 w-3" />
                    Journey GPT
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
            {sending && (
              <div className="self-start rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 animate-pulse text-violet-300" />
                  Thinking…
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer — input + disclaimer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="relative rounded-lg border border-input bg-transparent focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/40 dark:bg-input/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Describe the journey you want to build…"
            rows={2}
            className="max-h-40 min-h-[56px] w-full resize-none rounded-lg bg-transparent px-3 py-2.5 pr-9 text-[12px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            title="Expand"
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Expand className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className={cn(
              "absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              input.trim() && !sending
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 px-1 text-center text-[10px] leading-relaxed text-muted-foreground">
          Journey GPT can make mistakes. Review every node, run Validate and Test Run, and verify
          the flow before you publish. You are responsible for what goes live.
        </p>
      </div>
    </div>
  );
}
