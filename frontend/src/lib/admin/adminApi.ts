import { apiJson, apiFetch } from "../api/client";

export type AdminUser = {
  id: string;
  email: string;
  role: string | null;
  reported: boolean;
};

export type UserFilter = "all" | "banned";

export async function fetchAdminUsers(
  filter: UserFilter,
  limit: number,
  offset: number,
): Promise<AdminUser[]> {
  const params = new URLSearchParams({
    filter,
    limit: String(limit),
    offset: String(offset),
  });
  const response = await apiJson<{ users: AdminUser[] }>(
    `/admin/users?${params.toString()}`,
  );
  return response.users;
}

export async function searchAdminUsers(
  q: string,
  filter: UserFilter,
): Promise<AdminUser[]> {
  const params = new URLSearchParams({ q, filter });
  const response = await apiJson<{ users: AdminUser[] }>(
    `/admin/users/search?${params.toString()}`,
  );
  return response.users;
}

export type GroupedListingReport = {
  listingId: string;
  listingTitle: string;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
};

export async function fetchGroupedListingReports(): Promise<
  GroupedListingReport[]
> {
  const response = await apiJson<{
    reports: {
      listingId: string;
      listingTitle: string | null;
      count: number;
      unseenCount: number;
      reasons: string[];
      lastReportedAt: string | null;
    }[];
  }>("/admin/reports");

  return response.reports.map((r) => ({
    ...r,
    listingTitle: r.listingTitle ?? "Untitled listing",
  }));
}

export type ListingReportDetail = {
  listing: { id: string; title: string | null } | null;
  reports: {
    id: string;
    reason: string;
    created_at: string | null;
    reporter_id: string;
    reporter_email: string;
    reporter_name: string | null;
  }[];
};

export async function fetchListingReportDetail(
  listingId: string,
): Promise<ListingReportDetail> {
  return apiJson<ListingReportDetail>(`/admin/reports/${listingId}`);
}

export async function markListingReportsSeen(
  listingId: string,
): Promise<void> {
  await apiFetch(`/admin/reports/${listingId}/seen`, { method: "PATCH" });
}

export async function dismissListingReports(listingId: string): Promise<void> {
  await apiFetch(`/admin/reports/${listingId}`, { method: "DELETE" });
}

export type GroupedUserReport = {
  reportedId: string;
  reportedEmail: string;
  reportedName: string | null;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
};

export async function fetchGroupedUserReports(): Promise<
  GroupedUserReport[]
> {
  const response = await apiJson<{ reports: GroupedUserReport[] }>(
    "/admin/user-reports",
  );
  return response.reports;
}

export type UserReportDetail = {
  user: { id: string; name: string | null } | null;
  reports: {
    id: string;
    reason: string;
    created_at: string | null;
    reporter_id: string;
    reporter_email: string;
    reporter_name: string | null;
  }[];
};

export async function fetchUserReportDetail(
  reportedId: string,
): Promise<UserReportDetail> {
  return apiJson<UserReportDetail>(`/admin/user-reports/${reportedId}`);
}

export async function markUserReportsSeen(reportedId: string): Promise<void> {
  await apiFetch(`/admin/user-reports/${reportedId}/seen`, {
    method: "PATCH",
  });
}

export async function dismissUserReports(reportedId: string): Promise<void> {
  await apiFetch(`/admin/user-reports/${reportedId}`, { method: "DELETE" });
}
