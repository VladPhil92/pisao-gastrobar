"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { whatsappLink } from "@/lib/site-config";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const quickPrompts = [
  "¿Qué me recomiendas para comer?",
  "Quiero reservar una mesa",
  "Somos varios, ¿qué pedimos?",
  "Quiero pedir a domicilio",
];

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "¡Hola! Soy el asistente IA de PISÁO. Cuéntame qué plan tienes y te ayudo a elegir qué comer, reservar o hacer tu pedido.",
  },
];

export function PisaoConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await response.json()) as {
        text?: string;
        error?: string;
        fallback?: boolean;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "No fue posible responder.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.text! },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible responder.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${message} Si quieres, puedes continuar de inmediato con nuestro equipo por WhatsApp.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          aria-label="Asistente de PISÁO"
          className="border-pisao-gold/20 bg-pisao-carbon shadow-pisao-carbon/80 flex h-[min(680px,78svh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border shadow-2xl"
        >
          <header className="from-pisao-gold/18 border-pisao-gold/15 flex items-center gap-3 border-b bg-linear-to-r to-transparent px-4 py-4">
            <div className="bg-pisao-gold text-pisao-carbon flex size-10 items-center justify-center rounded-full">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-pisao-cream text-sm font-semibold">PISÁO Concierge</p>
                <span className="bg-pisao-green/25 text-pisao-cream rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  IA
                </span>
              </div>
              <p className="text-pisao-cream-muted mt-0.5 text-xs">
                Menú, reservas, pedidos y recomendaciones
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-pisao-cream-muted hover:text-pisao-cream rounded-full p-2 transition"
              aria-label="Cerrar asistente"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    message.role === "user"
                      ? "bg-pisao-gold text-pisao-carbon max-w-[86%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed"
                      : "bg-pisao-noche text-pisao-cream border-pisao-gold/10 max-w-[90%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid gap-2 pt-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="border-pisao-gold/20 text-pisao-cream hover:border-pisao-gold/50 hover:bg-pisao-gold/5 flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="text-pisao-gold size-4 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-pisao-noche border-pisao-gold/10 text-pisao-cream-muted flex items-center gap-2 rounded-2xl rounded-bl-md border px-4 py-3 text-sm">
                  <LoaderCircle className="size-4 animate-spin" />
                  Pensando qué te conviene…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-pisao-gold/10 border-t px-4 pt-3">
            <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
              <Link
                href="/menu"
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center transition"
              >
                Ver menú
              </Link>
              <Link
                href="/reservas"
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center transition"
              >
                Reservar
              </Link>
              <a
                href={whatsappLink("Hola PISÁO, necesito ayuda con mi visita o pedido.")}
                target="_blank"
                rel="noreferrer"
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center transition"
              >
                WhatsApp
              </a>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 pb-3">
              <label htmlFor="pisao-ai-input" className="sr-only">
                Escribe tu mensaje
              </label>
              <input
                id="pisao-ai-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1600}
                placeholder="Ej. Somos 4 y queremos comer bien…"
                className="border-pisao-gold/15 bg-pisao-noche text-pisao-cream placeholder:text-pisao-cream-muted/60 focus:border-pisao-gold min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm outline-none transition"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="bg-pisao-gold text-pisao-carbon disabled:bg-pisao-gold/30 flex size-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <Send className="size-4" />
              </button>
            </form>
            <p className="text-pisao-cream-muted/70 pb-3 text-center text-[9px] leading-relaxed">
              Asistente de inteligencia artificial de PISÁO. Para casos sensibles o confirmaciones especiales, interviene nuestro equipo.
            </p>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-pisao-gold text-pisao-carbon shadow-pisao-carbon/70 group flex items-center gap-3 rounded-full px-4 py-3 font-semibold shadow-2xl transition hover:-translate-y-0.5 hover:scale-[1.02]"
          aria-label="Abrir asistente de PISÁO"
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-black/10">
            <Bot className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-[#c79a3a]" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-bold">¿Qué se te antoja?</span>
            <span className="block text-[10px] font-medium opacity-70">Te ayudo a elegir</span>
          </span>
          <MessageCircle className="size-4 sm:hidden" />
        </button>
      )}
    </div>
  );
}
