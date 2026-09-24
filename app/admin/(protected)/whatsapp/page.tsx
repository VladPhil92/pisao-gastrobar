import { WhatsAppCoexistenceSetup } from "@/components/admin/WhatsAppCoexistenceSetup";
import { WhatsAppRuntimeControl } from "@/components/admin/WhatsAppRuntimeControl";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getWhatsAppIntegrationSummary } from "@/lib/whatsapp/integration-store";
import {
  getEmbeddedSignupConfigId,
  getWhatsAppRuntimeState,
} from "@/lib/whatsapp/meta-config";

function Status({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-pisao-cream text-sm font-semibold">{label}</p>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
        >
          {ok ? "LISTO" : "PENDIENTE"}
        </span>
      </div>
      <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

export default async function AdminWhatsAppPage() {
  await requireAdminRoute("/admin/whatsapp");
  const [integration, configId, runtime] = await Promise.all([
    getWhatsAppIntegrationSummary(),
    getEmbeddedSignupConfigId(),
    getWhatsAppRuntimeState(),
  ]);
  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim() || null;

  const appSecretReady = Boolean(process.env.WHATSAPP_META_APP_SECRET?.trim());
  const vaultReady = Boolean(
    process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim(),
  );
  const webhookTokenReady = Boolean(
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim(),
  );
  const webhookEnabled = runtime.enabled;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-pisao-gold text-xs font-semibold tracking-[0.22em] uppercase">
          PISÁO Messaging
        </p>
        <h1 className="font-display text-pisao-cream mt-2 text-4xl">
          WhatsApp & Coexistence
        </h1>
        <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
          Centro técnico para conectar WhatsApp Business App y Cloud API sin
          migrar el número fuera del teléfono. El Concierge permanece desactivado
          hasta completar los gates de Meta.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Status
          label="Webhook"
          ok={webhookTokenReady}
          detail={
            webhookTokenReady
              ? "Endpoint y token de verificación configurados."
              : "Falta el token de verificación del webhook."
          }
        />
        <Status
          label="Meta App Secret"
          ok={appSecretReady}
          detail={
            appSecretReady
              ? "Disponible solo en servidor para firmas y OAuth."
              : "Debe configurarse en Render; nunca se muestra aquí."
          }
        />
        <Status
          label="Token Vault"
          ok={vaultReady}
          detail={
            vaultReady
              ? "Los tokens de Embedded Signup pueden cifrarse en PostgreSQL."
              : "Falta la clave AES-256 de cifrado."
          }
        />
        <Status
          label="Embedded Signup"
          ok={Boolean(configId)}
          detail={
            configId
              ? "Configuration ID listo para abrir el onboarding de Meta."
              : "Guárdalo abajo cuando Meta genere la configuración."
          }
        />
        <Status
          label="Respuesta automática"
          ok={webhookEnabled}
          detail={
            webhookEnabled
              ? "Concierge está habilitado para responder por WhatsApp."
              : "Bloqueado deliberadamente hasta completar Coexistence."
          }
        />
      </div>

      <WhatsAppRuntimeControl
        initialEnabled={runtime.enabled}
        forceDisabled={runtime.forceDisabled}
        initialProbeStatus={runtime.lastProbeStatus}
        initialProbeCode={runtime.lastProbeCode}
        initialProbeAt={runtime.lastProbeAt?.toISOString() ?? null}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WhatsAppCoexistenceSetup appId={appId} configId={configId} />

        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5">
          <h2 className="font-display text-pisao-cream text-2xl">
            Conexión guardada
          </h2>
          {integration ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-pisao-cream-muted text-xs">Estado</dt>
                <dd className="text-emerald-300">{integration.status}</dd>
              </div>
              <div>
                <dt className="text-pisao-cream-muted text-xs">Modo</dt>
                <dd className="text-pisao-cream">
                  {integration.coexistence ? "Coexistence" : "Cloud API"}
                </dd>
              </div>
              <div>
                <dt className="text-pisao-cream-muted text-xs">Número</dt>
                <dd className="text-pisao-cream">
                  {integration.displayPhoneNumber || "No informado por Meta"}
                </dd>
              </div>
              <div>
                <dt className="text-pisao-cream-muted text-xs">Phone Number ID</dt>
                <dd className="text-pisao-cream break-all">
                  {integration.phoneNumberId}
                </dd>
              </div>
              <div>
                <dt className="text-pisao-cream-muted text-xs">WABA ID</dt>
                <dd className="text-pisao-cream break-all">
                  {integration.wabaId}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed">
              Aún no existe una conexión productiva guardada. Esto es correcto
              hasta completar Embedded Signup con el número del WhatsApp Business
              App.
            </p>
          )}

          <div className="mt-5 border-t border-pisao-gold/10 pt-4">
            <p className="text-pisao-gold text-xs font-semibold uppercase tracking-wider">
              Protección anti-respuesta doble
            </p>
            <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
              Cuando una persona del equipo responde desde WhatsApp Business App,
              los eventos smb_message_echoes activan handoff humano y silencian
              temporalmente al Concierge para ese cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
