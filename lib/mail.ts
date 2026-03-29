import nodemailer from "nodemailer";

export type MailConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
};

export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type MailSendResult =
  | {
      status: "sent";
      messageId: string;
    }
  | {
      status: "skipped";
      reason: "not_configured" | "no_recipients";
    }
  | {
      status: "failed";
      error: string;
    };

function normalizeRecipients(input: string | string[]) {
  return Array.from(
    new Set(
      (Array.isArray(input) ? input : [input])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function buildFromValue(input: MailConfig) {
  return input.smtp_from_name
    ? `${input.smtp_from_name} <${input.smtp_from_email}>`
    : input.smtp_from_email;
}

export function isMailConfigured(settings: MailConfig) {
  return Boolean(
    settings.smtp_host &&
      settings.smtp_port > 0 &&
      settings.smtp_username &&
      settings.smtp_password &&
      settings.smtp_from_email,
  );
}

export async function sendMailWithConfig(
  settings: MailConfig,
  message: MailMessage,
): Promise<MailSendResult> {
  const recipients = normalizeRecipients(message.to);

  if (recipients.length === 0) {
    return {
      status: "skipped",
      reason: "no_recipients",
    };
  }

  if (!isMailConfigured(settings)) {
    return {
      status: "skipped",
      reason: "not_configured",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password,
      },
    });

    const info = await transporter.sendMail({
      from: buildFromValue(settings),
      to: recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return {
      status: "sent",
      messageId: info.messageId,
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unknown email delivery error.";
    console.error("Email delivery failed.", error);
    return {
      status: "failed",
      error: messageText,
    };
  }
}
