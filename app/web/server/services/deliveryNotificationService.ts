import "server-only";

import nodemailer from "nodemailer";
import { z } from "zod";

import { activationLeadService } from "@/server/services/activationLeadService";

const deliveryNotificationSchema = z.object({
  sendEmail: z.boolean().optional().default(false)
});

type DeliveryNotificationInput = z.infer<typeof deliveryNotificationSchema>;

type DeliveryLead = NonNullable<Awaited<ReturnType<typeof activationLeadService.getById>>>;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

function cleanPhone(value?: string | null) {
  return (value ?? "").replace(/[^0-9]/g, "");
}

function normalizePublicUrl(domain?: string | null) {
  if (!domain) return null;
  const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  return cleanDomain ? `https://${cleanDomain}` : null;
}

function buildWhatsappUrl(phone: string, message: string) {
  const clean = cleanPhone(phone);
  return clean ? `https://wa.me/${clean}?text=${encodeURIComponent(message)}` : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";

  if (!host || !user || !password || !from || Number.isNaN(port)) {
    return null;
  }

  return { host, port, secure, user, password, from };
}

function getSupportLine() {
  return {
    email: process.env.PARTNERHUB_SUPPORT_EMAIL?.trim() || "soporte@partnerhub.club",
    whatsapp: process.env.PARTNERHUB_SUPPORT_WHATSAPP?.trim() || ""
  };
}

function buildDeliveryCopy(lead: DeliveryLead) {
  const onboarding = lead.onboardingData ?? {};
  const siteUrl = normalizePublicUrl(onboarding.domain);
  const support = getSupportLine();
  const subject = `Tu sitio web PartnerHub ya esta listo: ${lead.brandName}`;
  const purchaseUrl = onboarding.purchaseUrl || "Pendiente por confirmar";
  const visiblePhone = onboarding.phone || lead.whatsapp;
  const visibleWhatsapp = onboarding.whatsapp || lead.whatsapp;
  const analyticsId = onboarding.analyticsMeasurementId || "Pendiente / no configurado";
  const firstName = lead.fullName.split(" ").filter(Boolean)[0] || lead.brandName;

  const emailText = [
    `Hola ${lead.fullName},`,
    "",
    `Tu sitio web de ${lead.brandName} ya esta publicado y listo para revision.`,
    "",
    "Datos de entrega:",
    `- Sitio web: ${siteUrl ?? "Dominio pendiente por confirmar"}`,
    `- Marca visible: ${lead.brandName}`,
    `- WhatsApp de atencion: ${visibleWhatsapp}`,
    `- Telefono visible: ${visiblePhone}`,
    `- Enlace de compra / checkout: ${purchaseUrl}`,
    `- Analytics GA4: ${analyticsId}`,
    "",
    "Proximos pasos:",
    "1. Revisa que el nombre, telefono, WhatsApp y enlace de compra esten correctos.",
    "2. Si encuentras un ajuste puntual, respondeme este correo o escribeme por WhatsApp.",
    "3. El soporte mensual mantiene la pagina actualizada, permite ajustes operativos y aplica mejoras aprobadas de la plantilla PartnerHub.",
    "",
    "Recuerda:",
    "- El dominio, hosting y entorno tecnico son administrados por PartnerHub/Jairo Pinto mientras el servicio este activo.",
    "- Los cambios globales de plantilla se prueban primero en ganomaster.pro y luego se replican a paginas activas aprobadas.",
    "- Si tu pago fue por transferencia, conserva el comprobante enviado para confirmar la activacion del servicio.",
    "",
    `Soporte: ${support.email}${support.whatsapp ? ` | WhatsApp: ${support.whatsapp}` : ""}`,
    "",
    "Gracias por confiar en PartnerHub."
  ].join("\n");

  const whatsappMessage = [
    `Hola ${firstName}, tu sitio web PartnerHub ya esta listo.`,
    "",
    `Sitio: ${siteUrl ?? "Dominio pendiente"}`,
    `Marca: ${lead.brandName}`,
    `WhatsApp: ${visibleWhatsapp}`,
    `Telefono: ${visiblePhone}`,
    `Compra: ${purchaseUrl}`,
    "",
    "Por favor revisa que todo este correcto. Si necesitas un ajuste puntual, respondeme por este medio."
  ].join("\n");

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h2 style="margin:0 0 12px">Tu sitio web PartnerHub ya esta listo</h2>
      <p>Hola ${escapeHtml(lead.fullName)},</p>
      <p>Tu sitio web de <strong>${escapeHtml(lead.brandName)}</strong> ya esta publicado y listo para revision.</p>
      <h3>Datos de entrega</h3>
      <ul>
        <li><strong>Sitio web:</strong> ${siteUrl ? `<a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl)}</a>` : "Dominio pendiente por confirmar"}</li>
        <li><strong>WhatsApp de atencion:</strong> ${escapeHtml(visibleWhatsapp)}</li>
        <li><strong>Telefono visible:</strong> ${escapeHtml(visiblePhone)}</li>
        <li><strong>Enlace de compra:</strong> ${purchaseUrl.startsWith("http") ? `<a href="${escapeHtml(purchaseUrl)}">${escapeHtml(purchaseUrl)}</a>` : escapeHtml(purchaseUrl)}</li>
        <li><strong>Analytics GA4:</strong> ${escapeHtml(analyticsId)}</li>
      </ul>
      <h3>Proximos pasos</h3>
      <ol>
        <li>Revisa que el nombre, telefono, WhatsApp y enlace de compra esten correctos.</li>
        <li>Si encuentras un ajuste puntual, responde este correo o escribe por WhatsApp.</li>
        <li>El soporte mensual mantiene la pagina actualizada y permite aplicar mejoras aprobadas de PartnerHub.</li>
      </ol>
      <p style="font-size:13px;color:#4b5563">Soporte: ${escapeHtml(support.email)}${support.whatsapp ? ` | WhatsApp: ${escapeHtml(support.whatsapp)}` : ""}</p>
    </div>
  `;

  return {
    subject,
    emailText,
    emailHtml,
    whatsappMessage,
    siteUrl,
    whatsappUrl: buildWhatsappUrl(visibleWhatsapp, whatsappMessage),
    mailtoUrl: lead.email
      ? `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailText)}`
      : null
  };
}

async function prepareDeliveryNotification(leadId: string, input: DeliveryNotificationInput) {
  const parsed = deliveryNotificationSchema.parse(input);
  const lead = await activationLeadService.getById(leadId);
  if (!lead) throw new Error(`Activation lead ${leadId} was not found.`);

  const copy = buildDeliveryCopy(lead);
  let emailDelivery:
    | { attempted: false; status: "NOT_REQUESTED"; message: string }
    | { attempted: false; status: "NO_EMAIL"; message: string }
    | { attempted: false; status: "SMTP_NOT_CONFIGURED"; message: string }
    | { attempted: true; status: "SENT"; message: string; sentAt: string }
    | { attempted: true; status: "FAILED"; message: string };

  if (!parsed.sendEmail) {
    emailDelivery = {
      attempted: false,
      status: "NOT_REQUESTED",
      message: "Mensaje preparado. No se solicito envio de correo."
    };
  } else if (!lead.email) {
    emailDelivery = {
      attempted: false,
      status: "NO_EMAIL",
      message: "El empresario no tiene correo registrado. Usa WhatsApp o completa el correo primero."
    };
  } else {
    const smtp = getSmtpConfig();
    if (!smtp) {
      emailDelivery = {
        attempted: false,
        status: "SMTP_NOT_CONFIGURED",
        message: "SMTP no esta configurado. Copia el mensaje o abre el correo manualmente mientras configuras EasyPanel."
      };
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: {
            user: smtp.user,
            pass: smtp.password
          }
        });

        await transporter.sendMail({
          from: smtp.from,
          to: lead.email,
          subject: copy.subject,
          text: copy.emailText,
          html: copy.emailHtml
        });

        emailDelivery = {
          attempted: true,
          status: "SENT",
          message: `Correo enviado a ${lead.email}.`,
          sentAt: new Date().toISOString()
        };
      } catch (error) {
        emailDelivery = {
          attempted: true,
          status: "FAILED",
          message: error instanceof Error ? error.message : "No se pudo enviar el correo."
        };
      }
    }
  }

  return {
    leadId: lead.id,
    siteId: lead.siteId,
    brandName: lead.brandName,
    recipientEmail: lead.email,
    ...copy,
    emailDelivery
  };
}

export const deliveryNotificationService = {
  prepareDeliveryNotification
};
