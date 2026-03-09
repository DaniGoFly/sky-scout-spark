import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n/config";

export default class FlightResultsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[FlightResults] Render error boundary caught:", error);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertTitle>{i18n.t("error_boundary.something_went_wrong")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{i18n.t("error_boundary.offers_malformed")}</span>
            <Button variant="outline" size="sm" onClick={this.reset}>
              {i18n.t("error_boundary.try_again")}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
