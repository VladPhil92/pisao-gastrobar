"use client";

import { FormEvent, useState } from "react";
import {
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  ChefHat,
  LoaderCircle,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type AgentId = "gerencia" | "ventas" | "menu" | "contenido";
type Message = { role: "user" | "assistant"; content: string };

const agents = [
  {
    id: "gerencia" as const,
    name: "Gerencia IA",
    description: "Prioridades, riesgos, operación y decisiones de negocio.",
    icon: BrainCircuit,
    starter: "Dame un diagnóstico ejecutivo de PISÁO y prioriza las 5 acciones de mayor impacto.",
  },
  {
    id: "ventas" as const,
    name: "Revenue IA",
    description: "Conversión, ticket, productos y oportunidades comerciales.",
    icon: ChartNoAxesCombined,
    starter: "Analiza las ventas observadas y dime qué acciones podrían elevar el ticket y la conversión.",
  },
  {
    id: "menu" as const,
    name: "Menu Intelligence",
    description: "Demanda, disponibilidad y arquitectura de la carta.",
    icon: ChefHat,
    starter: "Audita el menú actual usando la demanda observada y señala productos a impulsar o revisar.",
  },
  {
    id: "contenido" as const,
    name: "Growth & Content",
    description: "Campañas y contenido basados en productos y datos reales.",
    icon: Megaphone,
    starter: "Propón una campaña comercial de 7 días basada en lo que realmente está vendiendo PISÁO.",
  },
];

export function AiCommandCenter() {
  const [agent, setAgent] = useState<AgentId>("gerencia");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const selected = agents.find((item) => item.id === agent) ?? agents[0];

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, messages: nextMessages }),
      });
      const payload = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "El agente no pudo responder.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.text! },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "No fue posible consultar al agente.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function selectAgent(next: AgentId) {
    setAgent(next);
    setMessages([]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
      <aside className="space-y-3">
        {agents.map((item) => {
          const Icon = item.icon;
          const active = item.id === agent;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectAgent(item.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-pisao-gold/50 bg-pisao-gold/10"
                  : "border-pisao-gold/10 bg-pisao-noche hover:border-pisao-gold/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-pisao-gold text-pisao-carbon" : "bg-pisao-gold/10 text-pisao-gold"}`}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="text-pisao-cream block text-sm font-semibold">
                    {item.name}
                  </span>
                  <span className="text-pisao-cream-muted mt-1 block text-xs leading-relaxed">
                    {item.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}

        <div className="border-pisao-green/30 bg-pisao-green/10 rounded-2xl border p-4">
          <div className="text-pisao-cream flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="size-4" />
            Gobierno de IA
          </div>
          <p className="text-pisao-cream-muted mt-2 text-[11px] leading-relaxed">
            Los agentes pueden analizar y recomendar. Precios, descuentos, reembolsos, disponibilidad y publicaciones requieren aprobación humana.
          </p>
        </div>
      </aside>

      <section className="border-pisao-gold/15 bg-pisao-noche flex min-h-[640px] flex-col overflow-hidden rounded-3xl border">
        <header className="border-pisao-gold/10 flex items-center gap-3 border-b px-5 py-4">
          <span className="bg-pisao-gold text-pisao-carbon flex size-10 items-center justify-center rounded-full">
            <Bot className="size-5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-pisao-cream text-sm font-semibold">{selected.name}</h2>
              <span className="bg-pisao-gold/15 text-pisao-gold rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                datos internos
              </span>
            </div>
            <p className="text-pisao-cream-muted mt-0.5 text-xs">
              Consulta pedidos, reservas y menú antes de responder.
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <span className="bg-pisao-gold/10 text-pisao-gold flex size-14 items-center justify-center rounded-2xl">
                <Sparkles className="size-6" />
              </span>
              <h3 className="font-display text-pisao-cream mt-5 text-3xl">
                Pregunta sobre el negocio real.
              </h3>
              <p className="text-pisao-cream-muted mt-3 max-w-md text-sm leading-relaxed">
                El agente recibe una fotografía operativa del menú, pedidos recientes y reservas antes de analizar tu solicitud.
              </p>
              <button
                type="button"
                onClick={() => void sendMessage(selected.starter)}
                className="border-pisao-gold/25 text-pisao-gold hover:bg-pisao-gold/10 mt-6 rounded-xl border px-4 py-3 text-sm font-semibold transition"
              >
                Ejecutar diagnóstico sugerido
              </button>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    message.role === "user"
                      ? "bg-pisao-gold text-pisao-carbon max-w-[82%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed"
                      : "border-pisao-gold/10 bg-pisao-carbon text-pisao-cream max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="border-pisao-gold/10 bg-pisao-carbon text-pisao-cream-muted flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
                <LoaderCircle className="size-4 animate-spin" />
                Analizando operación…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-pisao-gold/10 border-t p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              maxLength={2500}
              placeholder={`Pregunta a ${selected.name}…`}
              className="border-pisao-gold/15 bg-pisao-carbon text-pisao-cream placeholder:text-pisao-cream-muted/60 focus:border-pisao-gold min-h-12 flex-1 resize-none rounded-xl border px-3 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-pisao-gold text-pisao-carbon disabled:bg-pisao-gold/30 flex w-12 items-center justify-center rounded-xl disabled:cursor-not-allowed"
              aria-label="Enviar consulta"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
