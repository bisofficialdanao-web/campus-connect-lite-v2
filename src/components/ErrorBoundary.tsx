import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white border border-brand-border rounded-3xl shadow-huge p-8"
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h1 className="text-xl font-black text-brand-ink uppercase tracking-widest mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-brand-secondary font-medium mb-8 leading-relaxed">
              An unexpected error occurred while rendering this page. We've been notified and are looking into it.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-4 bg-brand-bg rounded-xl text-left overflow-hidden">
                <p className="text-[10px] font-mono text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand-primary text-white py-3 rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-neon"
              >
                <RefreshCw size={16} />
                Try Refreshing
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full bg-brand-surface border border-brand-border text-brand-ink py-3 rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-bg transition-all"
              >
                <Home size={16} />
                Return Home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
