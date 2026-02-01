import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Home, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

// Fallback UI component (used inside the class boundary)
const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  // useNavigate can't be used directly in class components, so we use a wrapper
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error while loading your flight results. 
          Please try searching again.
        </p>
        {error?.message && (
          <p className="text-xs text-muted-foreground/60 mb-6 bg-secondary/50 p-3 rounded-lg font-mono">
            {error.message}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/flights"}
            className="gap-2"
          >
            <Search className="w-4 h-4" />
            New Search
          </Button>
          {resetError && (
            <Button onClick={resetError} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class FlightErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[FlightErrorBoundary] Caught error:", error);
    console.error("[FlightErrorBoundary] Error info:", errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

export default FlightErrorBoundary;
