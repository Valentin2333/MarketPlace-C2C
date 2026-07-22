import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { fetchGroupedUserReports, markUserReportsSeen } from "../../lib/admin/adminApi";
import { UserReportsContext } from "./user-reports-context";
import type { GroupedUserReport, UserReportsApi } from "./user-reports-context";

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

    try {
      const rows = await fetchGroupedUserReports();
      setReportedUsers(rows);
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

  const markUserSeen = useCallback(async (reportedId: string) => {
    setReportedUsers((prev) =>
      prev.map((g) =>
        g.reportedId === reportedId ? { ...g, unseenCount: 0 } : g,
      ),
    );
    await markUserReportsSeen(reportedId);
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
