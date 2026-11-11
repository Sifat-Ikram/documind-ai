import { api } from '@/lib/api';

export async function downloadDocument(id: string): Promise<void> {
  const { url, fileName } = await api<{ url: string; fileName: string }>(
    `/documents/${id}/download`,
  );

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}