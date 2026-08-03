import { createContext } from "react";

export type GroupedUserReport = {
  reportedId: string;
  reportedEmail: string;
  reportedName: string | null;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
};

export type UserReportsApi = {
  reportedUsers: GroupedUserReport[];
  unseenCount: number;
  ready: boolean;
  refresh: () => Promise<void>;
  markUserSeen: (reportedId: string) => Promise<void>;
};

export const UserReportsContext = createContext<UserReportsApi | null>(null);
