import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import ErrorFallback from "./ErrorFallback";

export default function RouteErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();

  return (
    <ErrorBoundary
      key={location.pathname + location.search}
      fallback={(_error, reset) => (
        <ErrorFallback onRetry={reset} fullScreen={false} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
