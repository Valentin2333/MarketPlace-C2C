import { apiFetch } from "../api/client";

export async function uploadImage(
  blob: Blob,
  filename: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, filename);

  const response = await apiFetch("/uploads", {
    method: "POST",
    body: formData,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Could not upload image");
  }

  return (body as { url: string }).url;
}

export async function deleteImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const response = await apiFetch("/uploads", {
    method: "DELETE",
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Could not delete images");
  }
}
