import type { ReactNode } from "react";
import { useCurrentUser } from "../../lib/useCurrentUser";
import BannedPage from "./BannedPage";

export default function BanGate({ children }: { children: ReactNode }) {
  const { isBanned, ready } = useCurrentUser();

  if (!ready) return null;
  if (isBanned) return <BannedPage />;
  return <>{children}</>;
}
