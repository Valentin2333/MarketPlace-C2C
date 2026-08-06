const MAX_DIM = 1280;
const QUALITY = 0.72;

export async function compressImage(
  file: File,
): Promise<{ blob: Blob; ext: string; type: string }> {
  const fallback = () => {
    const ext = file.name.includes(".")
      ? (file.name.split(".").pop() as string)
      : "jpg";
    return {
      blob: file as Blob,
      ext,
      type: file.type || "application/octet-stream",
    };
  };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return fallback();
  }

  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return fallback();
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY),
  );
  if (!blob) return fallback();
  return { blob, ext: "jpg", type: "image/jpeg" };
}
