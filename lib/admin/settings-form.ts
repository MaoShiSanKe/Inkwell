import type {
  EmailNotificationScenario,
  PublicNoticeVariant,
} from "@/lib/settings-config";

export type SettingsFormValues = {
  admin_path: string;
  revision_limit: string;
  revision_ttl_days: string;
  excerpt_length: string;
  comment_moderation: "pending" | "approved" | "";
  smtp_host: string;
  smtp_port: string;
  smtp_secure: "true" | "false";
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  umami_enabled: "true" | "false";
  umami_website_id: string;
  umami_script_url: string;
  public_head_html: string;
  public_footer_html: string;
  public_custom_css: string;
  public_notice_enabled: "true" | "false";
  public_notice_variant: PublicNoticeVariant;
  public_notice_dismissible: "true" | "false";
  public_notice_version: string;
  public_notice_start_at: string;
  public_notice_start_at_iso: string;
  public_notice_end_at: string;
  public_notice_end_at_iso: string;
  public_notice_title: string;
  public_notice_body: string;
  public_notice_link_label: string;
  public_notice_link_url: string;
};

export type SettingsFormErrors = Partial<
  Record<keyof SettingsFormValues | "form", string>
>;

export type SettingsFormState = {
  values: SettingsFormValues;
  errors: SettingsFormErrors;
};

export type EmailNotificationsFormState = {
  scenarios: EmailNotificationScenario[];
  error?: string;
};

export const initialSettingsFormValues: SettingsFormValues = {
  admin_path: "admin",
  revision_limit: "20",
  revision_ttl_days: "30",
  excerpt_length: "150",
  comment_moderation: "pending",
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "false",
  smtp_username: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
  umami_enabled: "false",
  umami_website_id: "",
  umami_script_url: "",
  public_head_html: "",
  public_footer_html: "",
  public_custom_css: "",
  public_notice_enabled: "false",
  public_notice_variant: "info",
  public_notice_dismissible: "false",
  public_notice_version: "",
  public_notice_start_at: "",
  public_notice_start_at_iso: "",
  public_notice_end_at: "",
  public_notice_end_at_iso: "",
  public_notice_title: "",
  public_notice_body: "",
  public_notice_link_label: "",
  public_notice_link_url: "",
};

export const initialSettingsFormState: SettingsFormState = {
  values: initialSettingsFormValues,
  errors: {},
};

export function createSettingsFormState(
  values: Partial<SettingsFormValues> = {},
  errors: SettingsFormErrors = {},
): SettingsFormState {
  return {
    values: {
      ...initialSettingsFormValues,
      ...values,
    },
    errors,
  };
}

export function createEmailNotificationsFormState(
  scenarios: EmailNotificationScenario[] = [],
  error?: string,
): EmailNotificationsFormState {
  return {
    scenarios,
    error,
  };
}
