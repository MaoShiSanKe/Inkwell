"use server";

import { loginAdmin, logoutAdmin } from "@/lib/auth-actions";

export async function loginAction(formData: FormData) {
  const adminPath = String(formData.get("adminPath") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? `/${adminPath}`);

  return loginAdmin({
    adminPath,
    email,
    password,
    redirectTo,
  });
}

export async function logoutAction(formData: FormData) {
  const adminPath = String(formData.get("adminPath") ?? "admin");
  return logoutAdmin(adminPath);
}
