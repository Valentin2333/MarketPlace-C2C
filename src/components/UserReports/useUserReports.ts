import { useContext } from "react";
import { UserReportsContext } from "./user-reports-context";

export function useUserReports() {
  const ctx = useContext(UserReportsContext);
  if (!ctx) {
    throw new Error("useUserReports must be used within UserReportsProvider");
  }
  return ctx;
}
