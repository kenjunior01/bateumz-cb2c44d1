/**
 * Maps raw auth errors to safe, actionable messages.
 * Never reveals whether an email exists (account enumeration protection);
 * instead it points the user at the right next action.
 */

export type AuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "rate_limited"
  | "weak_password"
  | "email_exists"
  | "invalid_email"
  | "password_too_short"
  | "network"
  | "unknown";

export interface FriendlyAuthError {
  kind: AuthErrorKind;
  message: string;
  /** Suggested next action for the UI (e.g. show a "Create account" link). */
  action?: "signup" | "reset_password" | "resend_confirmation" | "retry";
}

const norm = (raw?: string) => (raw || "").toLowerCase();

export function describeSignInError(raw?: string): FriendlyAuthError {
  const m = norm(raw);

  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return {
      kind: "email_not_confirmed",
      message:
        "Your account exists but the email address hasn't been confirmed yet. Check your inbox for the confirmation link.",
      action: "resend_confirmation",
    };
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return {
      kind: "invalid_credentials",
      message:
        "We couldn't sign you in with those details. Double-check your password — or create an account if you haven't registered yet.",
      action: "signup",
    };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return {
      kind: "rate_limited",
      message: "Too many attempts. Please wait a moment and try again.",
      action: "retry",
    };
  }
  if (m.includes("invalid email")) {
    return { kind: "invalid_email", message: "That email address doesn't look valid." };
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return {
      kind: "network",
      message: "We couldn't reach the server. Check your connection and try again.",
      action: "retry",
    };
  }
  return {
    kind: "unknown",
    message: "Something went wrong while signing you in. Please try again.",
    action: "retry",
  };
}

export function describeSignUpError(raw?: string): FriendlyAuthError {
  const m = norm(raw);

  if (m.includes("weak") || m.includes("pwned") || m.includes("known to be")) {
    return {
      kind: "weak_password",
      message:
        "That password is too common or has appeared in a data breach. Use a unique mix of letters, numbers and symbols (at least 8 characters).",
    };
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already")
  ) {
    return {
      kind: "email_exists",
      message: "An account with this email already exists. Try signing in instead, or use another email.",
      action: "signup",
    };
  }
  if (m.includes("invalid email")) {
    return { kind: "invalid_email", message: "Invalid email. Please check the address." };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return { kind: "rate_limited", message: "Too many attempts. Wait a few seconds and try again.", action: "retry" };
  }
  if (m.includes("password should be at least") || m.includes("at least 6")) {
    return { kind: "password_too_short", message: "Password must be at least 8 characters." };
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return {
      kind: "network",
      message: "We couldn't reach the server. Check your connection and try again.",
      action: "retry",
    };
  }
  return {
    kind: "unknown",
    message: "We could not create your account. Please try again.",
    action: "retry",
  };
}
