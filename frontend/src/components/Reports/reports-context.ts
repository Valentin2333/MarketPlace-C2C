import { createContext } from "react";

export type GroupedReport = {
  listingId: string;
  listingTitle: string;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
};

export type ReportsApi = {
  reports: GroupedReport[];
  unseenCount: number;
  ready: boolean;
  refresh: () => Promise<void>;
  markListingSeen: (listingId: string) => Promise<void>;
};

export const ReportsContext = createContext<ReportsApi | null>(null);
