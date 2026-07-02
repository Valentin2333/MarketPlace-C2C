import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { UserReportsContext } from "./user-reports-context";
import type { GroupedUserReport, UserReportsApi } from "./user-reports-context";

type Row = {
  reported_id: string;
  reported_email: string;
  reported_name: string | null;
  report_count: number;
  unseen_count: number;
  reasons: string[] | null;
  last_reported_at: string | null;
};

export default function UserReportsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAdmin, ready: authReady } = useCurrentUser();
  const [reportedUsers, setReportedUsers] = useState<GroupedUserReport[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setReportedUsers([]);
      setReady(true);
      return;
    }

    const { data, error } = await supabase.rpc("admin_list_reported_users");
    if (error) {
      console.error("admin_list_reported_users failed:", error.message);
    }
    const rows = (data ?? []) as Row[];

    setReportedUsers(
      rows.map((r) => ({
        reportedId: r.reported_id,
        reportedEmail: r.reported_email,
        reportedName: r.reported_name,
        count: Number(r.report_count),
        unseenCount: Number(r.unseen_count),
        reasons: r.reasons ?? [],
        lastReportedAt: r.last_reported_at,
      })),
    );
    setReady(true);
  }, [isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    (async () => {
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [authReady, refresh]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("user-reports-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_reports" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  const markUserSeen = useCallback(async (reportedId: string) => {
    setReportedUsers((prev) =>
      prev.map((g) =>
        g.reportedId === reportedId ? { ...g, unseenCount: 0 } : g,
      ),
    );
    await supabase
      .from("user_reports")
      .update({ seen: true })
      .eq("reported_id", reportedId)
      .eq("seen", false);
  }, []);

  const unseenCount = useMemo(
    () => reportedUsers.filter((g) => g.unseenCount > 0).length,
    [reportedUsers],
  );

  const api = useMemo<UserReportsApi>(
    () => ({ reportedUsers, unseenCount, ready, refresh, markUserSeen }),
    [reportedUsers, unseenCount, ready, refresh, markUserSeen],
  );

  return (
    <UserReportsContext.Provider value={api}>
      {children}
    </UserReportsContext.Provider>
  );
}
