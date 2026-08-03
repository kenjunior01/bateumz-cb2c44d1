import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Mail, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  classifyResetError,
  logResetEvent,
  rememberResetEmail,
} from "@/lib/passwordResetTelemetry";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      logResetEvent({
        stage: "failed",
        reason: classifyResetError(error.message),
        email,
        errorMessage: error.message,
        metadata: { step: "request" },
      });
    } else {
      rememberResetEmail(email);
      setSent(true);
      logResetEvent({ stage: "requested", reason: "ok", email });
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
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
            {sent ? "Email Sent" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? "Check your inbox" : "Enter your email to reset your password"}
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          {sent ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a password reset link to<br />
                <strong className="text-foreground">{email}</strong>
              </p>
              <Link to="/login" className="text-primary hover:underline text-sm font-medium">
                Back to login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="h-10 w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full h-10 glow-primary">
                {loading ? "Sending..." : "Send Reset Link"}
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
