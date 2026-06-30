import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { ReportsContext } from "./reports-context";
import type { GroupedReport, ReportsApi } from "./reports-context";

type Row = {
  listing_id: string;
  listing_title: string | null;
  report_count: number;
  unseen_count: number;
  reasons: string[] | null;
  last_reported_at: string | null;
};

export default function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<GroupedReport[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setReports([]);
      setIsAdmin(false);
      setReady(true);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      setReports([]);
      setIsAdmin(false);
      setReady(true);
      return;
    }

    setIsAdmin(true);

    const { data } = await supabase.rpc("admin_list_reports");
    const rows = (data ?? []) as Row[];

    setReports(
      rows.map((r) => ({
        listingId: r.listing_id,
        listingTitle: r.listing_title ?? "Untitled listing",
        count: Number(r.report_count),
        unseenCount: Number(r.unseen_count),
        reasons: r.reasons ?? [],
        lastReportedAt: r.last_reported_at,
      })),
    );
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("reports-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  const markListingSeen = useCallback(async (listingId: string) => {
    setReports((prev) =>
      prev.map((g) =>
        g.listingId === listingId ? { ...g, unseenCount: 0 } : g,
      ),
    );
    await supabase
      .from("reports")
      .update({ seen: true })
      .eq("listing_id", listingId)
      .eq("seen", false);
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
