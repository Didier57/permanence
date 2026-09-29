import nodemailer, { type Transporter } from "nodemailer";

export type SmtpEncryption = "NONE" | "STARTTLS" | "SSL";

export type SmtpSettings = {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  user?: string | null;
  password?: string | null;
};

export function createTransport(settings: SmtpSettings): Transporter {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.encryption === "SSL",
    requireTLS: settings.encryption === "STARTTLS",
    auth: settings.user ? { user: settings.user, pass: settings.password ?? "" } : undefined,
  });
}

export async function verifyTransport(transport: Transporter): Promise<void> {
  await transport.verify();
}

export type OutgoingMail = {
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export async function sendMail(transport: Transporter, mail: OutgoingMail): Promise<void> {
  await transport.sendMail({
    from: mail.from,
    to: mail.to,
    cc: mail.cc && mail.cc.length > 0 ? mail.cc : undefined,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

export function formatFromAddress(address: string, name?: string | null): string {
  return name ? `"${name}" <${address}>` : address;
}
