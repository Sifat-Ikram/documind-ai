import { api } from "@/lib/api";
import type { DocumentSummary } from "@/types/api";

interface SignatureResponse {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  assetFolder: string;
}

export interface ConfirmResponse {
  document: DocumentSummary;
  warnings: string[];
}

export type UploadStage = "preparing" | "uploading" | "processing";

function sendToCloudinary(
  sig: SignatureResponse,
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("public_id", sig.publicId);
    form.append("asset_folder", sig.assetFolder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "The upload failed. Please try again.";
      try {
        const body = JSON.parse(xhr.responseText) as {
          error?: { message?: string };
        };
        if (body.error?.message)
          message = `Upload failed: ${body.error.message}`;
      } catch {
        // keep the default message
      }
      reject(new Error(message));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Network error while uploading. Check your connection and try again.",
        ),
      );
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(form);
  });
}

export async function uploadDocument(
  file: File,
  handlers: {
    onStage: (stage: UploadStage) => void;
    onProgress: (percent: number) => void;
    signal: AbortSignal;
  },
): Promise<ConfirmResponse> {
  handlers.onStage("preparing");
  const sig = await api<SignatureResponse>("/documents/upload-signature", {
    method: "POST",
    body: { fileName: file.name, fileSize: file.size },
  });

  handlers.onStage("uploading");
  await sendToCloudinary(sig, file, handlers.onProgress, handlers.signal);

  handlers.onStage("processing");
  return api<ConfirmResponse>("/documents/confirm", {
    method: "POST",
    body: { publicId: sig.publicId, originalName: file.name },
  });
}
