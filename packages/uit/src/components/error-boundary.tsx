import React, { type JSX } from "react";
import { getLogger } from "@ait/core";

const logger = getLogger();

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

class InnerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In the future, we could forward this to a logger with correlation IDs
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("UI ErrorBoundary caught:", { error: errorMessage, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600">
          <h2 className="font-semibold mb-2">Something went wrong.</h2>
          <p className="text-sm opacity-80">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props): JSX.Element {
  return <InnerErrorBoundary>{children}</InnerErrorBoundary>;
}
