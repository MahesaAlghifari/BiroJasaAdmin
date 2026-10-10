import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-card rounded-xl border border-destructive/20 shadow-xs m-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {this.props.fallbackTitle || "Terjadi kesalahan pada tampilan"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {this.props.fallbackDescription ||
              "Sistem mendeteksi inkonsistensi rendering. Anda dapat mencoba memuat ulang komponen atau halaman."}
          </p>

          {this.state.error && (
            <div className="w-full max-w-lg p-3 mb-6 bg-muted/60 rounded-md text-left text-xs font-mono text-muted-foreground overflow-auto max-h-32 border border-border">
              <span className="font-semibold text-destructive">{this.state.error.name}: </span>
              {this.state.error.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleReset}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </Button>
            <Button
              size="sm"
              onClick={this.handleReload}
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
            >
              <Home className="w-3.5 h-3.5" />
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
