import { cn } from "@/lib/utils";

export const CHECKOUT_STEPS = [
  { id: "entrega", label: "Entrega" },
  { id: "metodo", label: "Método de pago" },
  { id: "pago", label: "Pago" },
  { id: "confirmacion", label: "Confirmación" },
] as const;

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]["id"];

export function CheckoutSteps({ current }: { current: CheckoutStepId }) {
  const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
      {CHECKOUT_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "active"
              : "pending";

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                state === "active" &&
                  "border-pisao-gold bg-pisao-gold text-pisao-carbon",
                state === "done" && "border-pisao-gold text-pisao-gold",
                state === "pending" &&
                  "border-pisao-cream-muted/30 text-pisao-cream-muted/60",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                state === "active"
                  ? "text-pisao-cream"
                  : "text-pisao-cream-muted/70",
              )}
            >
              {step.label}
            </span>
            {index < CHECKOUT_STEPS.length - 1 && (
              <span className="bg-pisao-cream-muted/20 mx-1 h-px w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
