import { api } from "@/lib/api";

/** Saves a file from a URL. If the browser blocks reading it, the file opens in a new tab instead. */
export async function saveFromUrl(
  url: string,
  fileName: string,
): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export async function downloadDocument(id: string): Promise<void> {
  const { url, fileName } = await api<{ url: string; fileName: string }>(
    `/documents/${id}/download`,
  );
  await saveFromUrl(url, fileName);
}

/** One file after the other, with a short pause so the browser accepts them all. */
export async function downloadMany(
  files: { url: string; fileName: string }[],
): Promise<void> {
  for (const file of files) {
    await saveFromUrl(file.url, file.fileName);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
