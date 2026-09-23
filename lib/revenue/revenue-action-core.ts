export type RevenueActionCandidateType =
  | "FEATURE_PRODUCT"
  | "CONCIERGE_PAIRING"
  | "PAYMENT_FRICTION_REVIEW"
  | "RESERVATION_FRICTION_REVIEW"
  | "ATTRIBUTION_COVERAGE_REVIEW"
  | "CONCIERGE_DISCOVERY";

export type RevenueActionCandidate = {
  type: RevenueActionCandidateType;
  fingerprintKey: string;
  riskLevel: "LOW" | "MEDIUM";
  executionMode: "SYSTEM_AFTER_APPROVAL" | "MANUAL_AFTER_APPROVAL";
  priorityScore: number;
  title: string;
  rationale: string;
  recommendedAction: string;
  objectiveMetric: string;
  evidence: Record<string, string | number | boolean | null>;
  payload?: Record<string, string | number | boolean | string[]>;
};

export type RevenueActionInputs = {
  paidOrders: number;
  paymentStarted: number;
  paymentApprovalRate: number;
  attributionCoveragePct: number;
  reservationRequested: number;
  reservationConfirmationRate: number;
  assistedOrders: number;
  assistedAverageTicket: number;
  directTrackedOrders: number;
  directTrackedAverageTicket: number;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    units: number;
    revenue: number;
    featured: boolean;
    available?: boolean;
    lowInventory?: boolean;
    contributionMarginPct?: number | null;
  }>;
  pairs: Array<{
    productAId: string;
    productAName: string;
    productBId: string;
    productBName: string;
    orders: number;
    promotable?: boolean;
    costCoverage?: "COMPLETE" | "PARTIAL";
    contributionMarginPct?: number | null;
    profitabilityAdjustment?: number;
  }>;
};

function clampScore(value: number) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function buildRevenueActionCandidates(
  input: RevenueActionInputs,
): RevenueActionCandidate[] {
  const candidates: RevenueActionCandidate[] = [];

  const topUnfeatured = [...input.products]
    .filter(
      (product) =>
        !product.featured &&
        product.units >= 3 &&
        product.available !== false &&
        product.lowInventory !== true,
    )
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units)[0];

  if (topUnfeatured && input.paidOrders >= 3) {
    candidates.push({
      type: "FEATURE_PRODUCT",
      fingerprintKey: `feature-product:${topUnfeatured.id}`,
      riskLevel: "LOW",
      executionMode: "SYSTEM_AFTER_APPROVAL",
      priorityScore: clampScore(
        55 +
          Math.min(25, topUnfeatured.units * 2) +
          (topUnfeatured.contributionMarginPct == null
            ? 0
            : Math.max(
                -8,
                Math.min(8, (topUnfeatured.contributionMarginPct - 45) / 4),
              )),
      ),
      title: `Destacar ${topUnfeatured.name} en la carta`,
      rationale: `${topUnfeatured.name} acumula ${topUnfeatured.units} unidades vendidas y ${Math.round(topUnfeatured.revenue).toLocaleString("es-CO")} COP de ingreso pagado observado en la ventana, pero todavía no está marcado como destacado.`,
      recommendedAction:
        "Marcar el producto como destacado para aumentar su visibilidad sin modificar precio, descuento ni disponibilidad.",
      objectiveMetric: "paid_product_revenue_and_units",
      evidence: {
        productUnits30d: topUnfeatured.units,
        productRevenue30d: Math.round(topUnfeatured.revenue),
        paidOrders30d: input.paidOrders,
        baselineDailyUnits: Number((topUnfeatured.units / 30).toFixed(3)),
      },
      payload: {
        productId: topUnfeatured.id,
        productName: topUnfeatured.name,
        productSlug: topUnfeatured.slug,
      },
    });
  }

  const topPair = [...input.pairs]
    .filter((pair) => pair.promotable !== false)
    .sort(
      (a, b) =>
        b.orders - a.orders ||
        (b.profitabilityAdjustment ?? 0) -
          (a.profitabilityAdjustment ?? 0),
    )[0];
  if (topPair && topPair.orders >= 2 && input.paidOrders >= 4) {
    candidates.push({
      type: "CONCIERGE_PAIRING",
      fingerprintKey: `concierge-pair:${[topPair.productAId, topPair.productBId].sort().join(":")}`,
      riskLevel: "LOW",
      executionMode: "SYSTEM_AFTER_APPROVAL",
      priorityScore: clampScore(
        60 + topPair.orders * 5 + (topPair.profitabilityAdjustment ?? 0),
      ),
      title: `Activar maridaje: ${topPair.productAName} + ${topPair.productBName}`,
      rationale: `La combinación aparece en ${topPair.orders} pedidos pagados observados. Es una señal de afinidad real de cesta, no una recomendación inventada por el modelo.`,
      recommendedAction:
        "Permitir que PISÁO Concierge mencione esta combinación cuando sea relevante para la intención del cliente, sin forzarla ni aplicar descuentos.",
      objectiveMetric: "paid_pair_orders",
      evidence: {
        pairOrders30d: topPair.orders,
        paidOrders30d: input.paidOrders,
        baselineDailyPairOrders: Number((topPair.orders / 30).toFixed(3)),
        costCoverage: topPair.costCoverage ?? "PARTIAL",
        contributionMarginPct: topPair.contributionMarginPct ?? null,
      },
      payload: {
        productAId: topPair.productAId,
        productAName: topPair.productAName,
        productBId: topPair.productBId,
        productBName: topPair.productBName,
      },
    });
  }

  if (input.paymentStarted >= 4 && input.paymentApprovalRate < 75) {
    candidates.push({
      type: "PAYMENT_FRICTION_REVIEW",
      fingerprintKey: "payment-friction",
      riskLevel: "MEDIUM",
      executionMode: "MANUAL_AFTER_APPROVAL",
      priorityScore: clampScore(90 - input.paymentApprovalRate / 2),
      title: "Revisar fricción entre pago iniciado y pago aprobado",
      rationale: `La aprobación observada es ${input.paymentApprovalRate}% sobre ${input.paymentStarted} pagos iniciados.`,
      recommendedAction:
        "Revisar tiempos de validación, claridad del QR/Bre-B, carga de comprobante y operación de caja. No aplicar incentivos ni descuentos hasta conocer la causa.",
      objectiveMetric: "payment_approval_rate",
      evidence: {
        paymentStarted30d: input.paymentStarted,
        paymentApprovalRate30d: input.paymentApprovalRate,
      },
    });
  }

  if (
    input.reservationRequested >= 4 &&
    input.reservationConfirmationRate < 70
  ) {
    candidates.push({
      type: "RESERVATION_FRICTION_REVIEW",
      fingerprintKey: "reservation-friction",
      riskLevel: "MEDIUM",
      executionMode: "MANUAL_AFTER_APPROVAL",
      priorityScore: clampScore(85 - input.reservationConfirmationRate / 2),
      title: "Auditar solicitudes de reserva que no llegan a confirmación",
      rationale: `La tasa observada de confirmación/completitud es ${input.reservationConfirmationRate}% sobre ${input.reservationRequested} solicitudes recientes.`,
      recommendedAction:
        "Revisar disponibilidad, copy, abandono del formulario y handoff a WhatsApp antes de modificar políticas de reserva.",
      objectiveMetric: "reservation_confirmation_rate",
      evidence: {
        reservationRequested30d: input.reservationRequested,
        reservationConfirmationRate30d: input.reservationConfirmationRate,
      },
    });
  }

  if (input.paidOrders >= 3 && input.attributionCoveragePct < 80) {
    candidates.push({
      type: "ATTRIBUTION_COVERAGE_REVIEW",
      fingerprintKey: "attribution-coverage",
      riskLevel: "LOW",
      executionMode: "MANUAL_AFTER_APPROVAL",
      priorityScore: clampScore(80 - input.attributionCoveragePct / 2),
      title: "Elevar cobertura de atribución antes de automatizar decisiones",
      rationale: `Solo ${input.attributionCoveragePct}% de los pagos aprobados observados tiene una sesión first-party enlazada.`,
      recommendedAction:
        "Revisar pérdida de sessionId entre navegación y checkout y validar que Behavioral Intelligence permanezca disponible durante todo el recorrido.",
      objectiveMetric: "paid_order_attribution_coverage",
      evidence: {
        paidOrders30d: input.paidOrders,
        attributionCoveragePct30d: input.attributionCoveragePct,
      },
    });
  }

  if (
    input.assistedOrders >= 3 &&
    input.directTrackedOrders >= 3 &&
    input.directTrackedAverageTicket > 0 &&
    input.assistedAverageTicket >= input.directTrackedAverageTicket * 1.1
  ) {
    const lift =
      ((input.assistedAverageTicket - input.directTrackedAverageTicket) /
        input.directTrackedAverageTicket) *
      100;

    candidates.push({
      type: "CONCIERGE_DISCOVERY",
      fingerprintKey: "concierge-discovery",
      riskLevel: "LOW",
      executionMode: "MANUAL_AFTER_APPROVAL",
      priorityScore: clampScore(65 + Math.min(20, lift / 2)),
      title: "Probar mayor descubrimiento de Concierge",
      rationale: `El ticket promedio observado en sesiones asistidas es ${Math.round(input.assistedAverageTicket).toLocaleString("es-CO")} COP frente a ${Math.round(input.directTrackedAverageTicket).toLocaleString("es-CO")} COP en sesiones directas rastreadas (+${Math.round(lift)}%). La relación es descriptiva y no demuestra causalidad.`,
      recommendedAction:
        "Diseñar una prueba controlada de mayor visibilidad del Concierge y medir conversión/ticket antes de convertirla en política permanente.",
      objectiveMetric: "assisted_vs_direct_aov",
      evidence: {
        assistedOrders30d: input.assistedOrders,
        directTrackedOrders30d: input.directTrackedOrders,
        assistedAverageTicket: input.assistedAverageTicket,
        directTrackedAverageTicket: input.directTrackedAverageTicket,
        observedDifferencePct: Math.round(lift),
      },
    });
  }

  return candidates.sort(
    (a, b) => b.priorityScore - a.priorityScore || a.type.localeCompare(b.type),
  );
}
