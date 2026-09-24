export type PublicWebProbe = {
  configured: boolean;
  homeOk: boolean;
  releaseEndpointOk: boolean;
  releaseCoherent: boolean;
  publicRelease: string | null;
  expectedRelease: string | null;
  currentRelease: boolean;
  legacyReleaseAbsent: boolean;
  healthOk: boolean;
  databaseOk: boolean;
  imageOk: boolean;
  imageBytes: number;
  securityHeadersOk: boolean;
};

export function publicWebCertified(probe: PublicWebProbe) {
  return (
    probe.configured &&
    probe.homeOk &&
    probe.releaseEndpointOk &&
    probe.releaseCoherent &&
    probe.currentRelease &&
    probe.legacyReleaseAbsent &&
    probe.healthOk &&
    probe.databaseOk &&
    probe.imageOk &&
    probe.imageBytes >= 50_000 &&
    probe.securityHeadersOk
  );
}

export function publicWebEvidence(probe: PublicWebProbe) {
  if (!probe.configured) return "URL pública HTTPS no configurada.";
  if (!probe.homeOk) return "El Home público no respondió correctamente.";
  if (!probe.releaseEndpointOk) {
    return "El dominio público no expone una huella de release verificable.";
  }
  if (!probe.releaseCoherent) {
    return `El dominio público sirve el release ${probe.publicRelease ?? "desconocido"}, distinto del proceso actual ${probe.expectedRelease ?? "desconocido"}.`;
  }
  if (!probe.currentRelease || !probe.legacyReleaseAbsent) {
    return "El dominio público todavía no sirve la versión esperada del Home.";
  }
  if (!probe.healthOk || !probe.databaseOk) {
    return "El health check público no certifica aplicación y base de datos.";
  }
  if (!probe.imageOk || probe.imageBytes < 50_000) {
    return "La fotografía principal solicitada no está siendo entregada como imagen válida.";
  }
  if (!probe.securityHeadersOk) {
    return "El sitio responde, pero faltan headers de seguridad esperados.";
  }
  return `Release ${probe.publicRelease ?? "verificado"}, Home, health check, fotografía crítica y headers de seguridad responden correctamente desde el dominio público.`;
}
