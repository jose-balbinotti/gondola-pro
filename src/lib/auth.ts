import type { AuthError } from "@supabase/supabase-js";

export type AuthMode = "login" | "register";

export type RedirectState = {
  from?: string;
};

const DEFAULT_AUTH_REDIRECT = "/dashboard";
const MIN_PASSWORD_LENGTH = 8;

export function getSafeRedirectPath(state: unknown, fallback = DEFAULT_AUTH_REDIRECT): string {
  const maybeState = state as RedirectState | null;
  const from = maybeState?.from;

  if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }

  return fallback;
}

export function getAuthRedirectUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return null;
}

export function getAuthErrorMessage(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (!message) return "Não foi possível autenticar. Tente novamente.";

  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Já existe uma conta cadastrada com este e-mail.";
  }

  if (message.includes("password should be at least")) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (message.includes("signup is disabled")) {
    return "O cadastro está temporariamente indisponível.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (message.includes("expired") || message.includes("invalid token")) {
    return "O link expirou ou é inválido. Solicite um novo link.";
  }

  return "Não foi possível concluir a operação. Revise os dados e tente novamente.";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  const maybeAuthError = error as Partial<AuthError> | null;
  if (maybeAuthError?.message) return maybeAuthError.message;

  return "";
}
