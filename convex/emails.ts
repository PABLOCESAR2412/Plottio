import { internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";

/**
 * Envío de emails transaccionales con Resend.
 *
 * CONFIGURACIÓN (obligatoria antes de usarlo en producción):
 *   1. Crea una API key en https://resend.com/api-keys
 *   2. Configúrala en Convex:
 *        npx convex env set RESEND_API_KEY re_xxxxxxxxxxxx
 *        npx convex env set RESEND_CITA_TO correo@empresa.com
 *        npx convex env set RESEND_BUG_TO soporte@plottio.com
 *      (opcional) npx convex env set RESEND_FROM "Plottio <no-reply@tu-dominio>"
 *
 * Si `RESEND_API_KEY` no está definida, el envío se omite silenciosamente
 * para no romper el flujo en entornos dev.
 */

async function sendResendEmail(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error("Resend error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Resend error:", error);
    return false;
  }
}

const htmlShell = (title: string, body: string) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;">
    <h2 style="color:#18181b;margin:0 0 16px;">${title}</h2>
    <p style="color:#3f3f46;line-height:1.6;margin:0;">${body}</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />
    <p style="color:#a1a1aa;font-size:12px;margin:0;">Enviado automáticamente por Plottio.</p>
  </div>
`;

export const enviarEmailCita = internalAction({
  args: {
    clienteNombre: v.string(),
    clienteTelefono: v.string(),
    vehiculoPlaca: v.string(),
    servicio: v.string(),
    fecha: v.string(),
    hora: v.string(),
    empresaNombre: v.string(),
  },
  handler: async (_ctx, args) => {
    const to = process.env.RESEND_CITA_TO;
    if (!to) return { enviado: false, motivo: "sin destinatario configurado" };

    const ok = await sendResendEmail({
      from: process.env.RESEND_FROM ?? "Plottio <onboarding@resend.dev>",
      to,
      subject: `Nueva cita agendada - ${args.clienteNombre}`,
      html: htmlShell(
        "Nueva cita agendada",
        `<strong>Cliente:</strong> ${args.clienteNombre}<br/>
         <strong>Teléfono:</strong> ${args.clienteTelefono}<br/>
         <strong>Placa:</strong> ${args.vehiculoPlaca}<br/>
         <strong>Servicio:</strong> ${args.servicio}<br/>
         <strong>Fecha:</strong> ${args.fecha} - ${args.hora}<br/>
         <strong>Empresa:</strong> ${args.empresaNombre}`,
      ),
    });
    return { enviado: ok, motivo: ok ? "ok" : "error al enviar" };
  },
});

export const enviarEmailBug = internalAction({
  args: {
    titulo: v.string(),
    descripcion: v.string(),
    tipo: v.string(),
    importancia: v.string(),
    ruta: v.string(),
    usuarioNombre: v.string(),
    empresaNombre: v.string(),
  },
  handler: async (_ctx, args) => {
    const to = process.env.RESEND_BUG_TO;
    if (!to) return { enviado: false, motivo: "sin destinatario configurado" };

    const ok = await sendResendEmail({
      from: process.env.RESEND_FROM ?? "Plottio <onboarding@resend.dev>",
      to,
      subject: `[${args.importancia}] Reporte de bug: ${args.titulo}`,
      html: htmlShell(
        "Nuevo reporte de bug",
        `<strong>Título:</strong> ${args.titulo}<br/>
         <strong>Descripción:</strong> ${args.descripcion}<br/>
         <strong>Tipo:</strong> ${args.tipo}<br/>
         <strong>Importancia:</strong> ${args.importancia}<br/>
         <strong>Ruta:</strong> ${args.ruta}<br/>
         <strong>Reportado por:</strong> ${args.usuarioNombre}<br/>
         <strong>Empresa:</strong> ${args.empresaNombre}`,
      ),
    });
    return { enviado: ok, motivo: ok ? "ok" : "error al enviar" };
  },
});
