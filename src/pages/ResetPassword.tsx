import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, ArrowLeft, Check, Mail, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  classifyResetError,
  getRememberedResetEmail,
  logResetEvent,
  rememberResetEmail,
  type ResetReason,
} from "@/lib/passwordResetTelemetry";

const REASON_TEXT: Record<string, string> = {
  token_missing: "This link has no reset token. It may have been altered by your email client.",
  token_mismatch: "This reset token doesn't match any pending request.",
  expired: "This reset link has expired.",
  replayed: "This reset link has already been used.",
  invalid: "This password reset link is invalid.",
  no_session: "This password reset link is invalid or has expired.",
  unknown: "This password reset link is invalid or has expired.",
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<ResetReason>("unknown");
  const [resendEmail, setResendEmail] = useState(getRememberedResetEmail());
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const check = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const errDesc = hash.get("error_description") || query.get("error_description");
      if (errDesc) {
        if (active) {
          const reason = classifyResetError(errDesc);
          setFailReason(reason);
          setLinkError(REASON_TEXT[reason] || errDesc);
          setChecking(false);
        }
        logResetEvent({
          stage: "failed",
          reason: classifyResetError(errDesc),
          errorMessage: errDesc,
          linkType: "url_error",
        });
        return;
      }

      // Recovery links may arrive as hash tokens, a PKCE ?code=, or ?token_hash=
      const linkType = hash.get("access_token")
        ? "hash_tokens"
        : query.get("code")
        ? "pkce_code"
        : query.get("token_hash")
        ? "token_hash"
        : "none";

      if (hash.get("type") === "recovery" || query.get("type") === "recovery" || query.get("code")) {
        if (active) setIsRecovery(true);
      }

      const tokenHash = query.get("token_hash");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        if (active) {
          if (error) {
            const reason = classifyResetError(error.message);
            setFailReason(reason);
            setLinkError(REASON_TEXT[reason] || error.message);
          } else {
            setIsRecovery(true);
          }
          setChecking(false);
        }
        logResetEvent({
          stage: error ? "failed" : "verified",
          reason: error ? classifyResetError(error.message) : "ok",
          errorMessage: error?.message,
          linkType,
        });
        return;
      }

      // Fall back to an already-established recovery session
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setIsRecovery(true);
        logResetEvent({ stage: "verified", reason: "ok", linkType });
      } else {
        const reason: ResetReason = linkType === "none" ? "token_missing" : "no_session";
        setFailReason(reason);
        setLinkError(REASON_TEXT[reason]);
        logResetEvent({ stage: "failed", reason, linkType });
      }
      setChecking(false);
    };

    // Give the Supabase client a moment to process the URL itself
    const timer = setTimeout(check, 300);

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleResend = async () => {
    const target = resendEmail.trim();
    if (!target) {
      toast.error("Enter the email you used to request the reset");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResending(false);

    if (error) {
      toast.error(error.message);
      logResetEvent({
        stage: "failed",
        reason: classifyResetError(error.message),
        email: target,
        errorMessage: error.message,
        metadata: { step: "resend" },
      });
      return;
    }

    rememberResetEmail(target);
    setResent(true);
    toast.success("New reset link sent — check your inbox");
    logResetEvent({ stage: "resent", reason: "ok", email: target, metadata: { after: failReason } });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      logResetEvent({
        stage: "failed",
        reason: classifyResetError(error.message),
        errorMessage: error.message,
        metadata: { step: "update_password" },
      });
    } else {
      setSuccess(true);
      toast.success("Password updated successfully!");
      logResetEvent({ stage: "completed", reason: "ok" });
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  if (checking && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <p className="text-foreground font-medium mb-2">
            {linkError || REASON_TEXT[failReason]}
          </p>
          <p className="text-muted-foreground text-sm mb-5">
            Send yourself a fresh link and open it on this same device.
          </p>

          <div className="glass rounded-2xl p-5 text-left">
            {resent ? (
              <div className="text-center py-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  New link sent to <strong className="text-foreground">{resendEmail}</strong>
                </p>
              </div>
            ) : (
              <>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Your email</label>
                <div className="relative mb-3">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button onClick={handleResend} disabled={resending} className="w-full h-10 glow-primary">
                  <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Sending..." : "Resend reset link"}
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">Use another email</Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:underline">Back to login</Link>
          </div>
        </motion.div>
      </div>
    );
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">Bateu</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {success ? "Password Updated!" : "New Password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {success ? "You can now sign in with your new password" : "Set your new password"}
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">Redirecting to login...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 glow-primary">
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
