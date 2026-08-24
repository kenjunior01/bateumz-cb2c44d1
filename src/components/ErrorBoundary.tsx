import { Component, type ReactNode, type ErrorInfo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 20 };

/* Motion-enhanced error UI as a separate functional component */
function ErrorFallback({ error, onReset, onReload }: { error: Error | null; onReset: () => void; onReload: () => void }) {
  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center relative overflow-hidden"
      role="alert"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Gradient background accents */
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: "spring" as const, stiffness: 200, damping: 15 }}
        className="relative mb-6"
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        {/* Pulsing ring */
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-destructive/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-2 text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
      >
        Something went wrong
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mb-1 max-w-md text-sm text-muted-foreground"
      >
        An unexpected error occurred. Try reloading the page.
      </motion.p>

      {error && (
        <motion.pre
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mt-3 max-w-lg overflow-auto rounded-lg bg-destructive/10 border border-destructive/15 p-3 text-left text-xs text-destructive"
        >
          {error.message}
        </motion.pre>
      )}

      <motion.div
        className="mt-6 flex gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <motion.button
          onClick={onReset}
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/90 px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:from-primary/95 hover:to-primary/85"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </motion.button>
        <motion.button
          onClick={onReload}
          whileHover={{ scale: 1.05, borderColor: "hsl(var(--border))" }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          onReload={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
