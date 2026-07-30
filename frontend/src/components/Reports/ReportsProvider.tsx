import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { fetchGroupedListingReports, markListingReportsSeen } from "../../lib/admin/adminApi";
import { onWsEvent } from "../../lib/ws/wsClient";
import { ReportsContext } from "./reports-context";
import type { GroupedReport, ReportsApi } from "./reports-context";

export default function ReportsProvider({ children }: { children: ReactNode }) {
  const { isAdmin, ready: authReady } = useCurrentUser();
  const [reports, setReports] = useState<GroupedReport[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setReports([]);
      setReady(true);
      return;
    }

    try {
      const rows = await fetchGroupedListingReports();
      setReports(rows);
    } finally {
      setReady(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const load = async () => {
      if (active) await refresh();
    };
    load();
    return () => {
      active = false;
    };
  }, [authReady, refresh]);

  useEffect(() => {
    if (!isAdmin) return;
    return onWsEvent("report:new", (raw) => {
      const payload = raw as { kind: string };
      if (payload.kind !== "listing") return;
      refresh();
    });
  }, [isAdmin, refresh]);

  const markListingSeen = useCallback(async (listingId: string) => {
    setReports((prev) =>
      prev.map((g) =>
        g.listingId === listingId ? { ...g, unseenCount: 0 } : g,
      ),
    );
    await markListingReportsSeen(listingId);
  }, []);

  const unseenCount = useMemo(
    () => reports.filter((g) => g.unseenCount > 0).length,
    [reports],
  );

  const api = useMemo<ReportsApi>(
    () => ({ reports, unseenCount, ready, refresh, markListingSeen }),
    [reports, unseenCount, ready, refresh, markListingSeen],
  );

  return (
    <ReportsContext.Provider value={api}>{children}</ReportsContext.Provider>
  );
}
