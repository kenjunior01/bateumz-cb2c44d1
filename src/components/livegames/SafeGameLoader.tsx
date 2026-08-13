import { Component, type ReactNode, type ComponentType } from "react";
import { Loader2 } from "lucide-react";

interface SafeLazyProps {
  factory: () => Promise<{ default: ComponentType<any> }>;
  gameName: string;
  fallback?: ReactNode;
  componentProps?: Record<string, any>;
}

interface SafeLazyState {
  Component: ComponentType<any> | null;
  error: Error | null;
  retryKey: number;
}

/**
 * SafeGameLoader: wraps React.lazy with error recovery.
 * Unlike plain Suspense (which shows infinite spinner on chunk failure),
 * this component catches lazy-loading errors and shows a retry UI.
 */
class SafeLazyLoader extends Component<SafeLazyProps, SafeLazyState> {
  constructor(props: SafeLazyProps) {
    super(props);
    this.state = { Component: null, error: null, retryKey: 0 };
  }

  private _loaded = false;
  private _factory: (() => Promise<{ default: ComponentType<any> }>) | null = null;

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidMount() {
    this._load();
  }

  componentDidUpdate(prevProps: SafeLazyProps, prevState: SafeLazyState) {
    if (this.state.retryKey !== prevState.retryKey && this.state.error === null) {
      this._loaded = false;
      this._factory = null;
      this._load();
    }
  }

  private _load() {
    if (this._loaded) return;
    this._loaded = true;
    this._factory = this.props.factory;

    this._factory()
      .then((mod) => {
        if (this._factory !== this.props.factory && !this._factory) return;
        this.setState({ Component: mod.default, error: null });
      })
      .catch((err) => {
        console.error(`[SafeGameLoader] Failed to load ${this.props.gameName}:`, err);
        this.setState({ error: err instanceof Error ? err : new Error(String(err)) });
      });
  }

  handleRetry = () => {
    this._loaded = false;
    this._factory = null;
    this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }));
  };

  handleSelectOther = () => {
    window.dispatchEvent(new CustomEvent("game-error-select-other"));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-dashed border-destructive/30 bg-gradient-to-b from-destructive/5 to-transparent">
          <div className="text-5xl mb-4">!</div>
          <p className="text-sm font-bold mb-1">Erro ao carregar {this.props.gameName}</p>
          <p className="text-[11px] text-muted-foreground mb-5 text-center max-w-xs">
            Ocorreu um problema ao carregar o jogo. Tenta novamente ou escolhe outro jogo.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={this.handleSelectOther}
              className="text-xs px-4 py-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold transition-colors"
            >
              Outro jogo
            </button>
          </div>
        </div>
      );
    }

    if (this.state.Component) {
      return (
        <GameErrorBoundary gameName={this.props.gameName}>
          <this.state.Component {...(this.props.componentProps || {})} />
        </GameErrorBoundary>
      );
    }

    return this.props.fallback || (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
}

/* ------------------------------------------------------------------ */
/*  GameErrorBoundary – catches render-time errors inside game comps   */
/* ------------------------------------------------------------------ */
interface EBProps { children: ReactNode; gameName: string }
interface EBState { hasError: boolean; resetKey: number; errorMsg: string }

class GameErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, resetKey: 0, errorMsg: "" };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    console.error(`[GameErrorBoundary] ${this.props.gameName}:`, err);
    const msg = err.message || "Erro desconhecido";
    this.setState({ errorMsg: msg.length > 120 ? msg.slice(0, 120) + "..." : msg });
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, resetKey: (s.resetKey || 0) + 1, errorMsg: "" }));
  };

  handleSelectOther = () => {
    window.dispatchEvent(new CustomEvent("game-error-select-other"));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-dashed border-destructive/30 bg-gradient-to-b from-destructive/5 to-transparent">
          <div className="text-5xl mb-4">!</div>
          <p className="text-sm font-bold mb-1">Erro ao carregar {this.props.gameName}</p>
          <p className="text-[11px] text-muted-foreground mb-5 text-center max-w-xs">
            Ocorreu um problema inesperado. Tenta novamente ou escolhe outro jogo.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={this.handleSelectOther}
              className="text-xs px-4 py-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold transition-colors"
            >
              Outro jogo
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

export { GameErrorBoundary };
export default SafeLazyLoader;
