import { AiCommandCenter } from "@/components/admin/AiCommandCenter";

export default function AdminAiPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-pisao-gold text-xs font-semibold tracking-[0.22em] uppercase">
          PISÁO Intelligence
        </p>
        <h1 className="font-display text-pisao-cream mt-2 text-4xl">
          Centro de Comando IA
        </h1>
        <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
          Agentes especializados para analizar la operación, detectar oportunidades y convertir los datos del gastrobar en decisiones concretas. Las acciones sensibles permanecen bajo aprobación humana.
        </p>
      </div>

      <AiCommandCenter />
    </div>
  );
}
