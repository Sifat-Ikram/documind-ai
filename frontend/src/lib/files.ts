import type { FileType } from "@/types/api";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPT = ".pdf,.docx,.txt";

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function fileTypeOf(name: string): FileType | null {
  const ext = extensionOf(name);
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (ext === "txt") return "TXT";
  return null;
}

export function validateFile(file: File): string | null {
  if (extensionOf(file.name) === "doc") {
    return "Old .doc files are not supported. Save the file as .docx and upload it again.";
  }
  if (!fileTypeOf(file.name))
    return "Only PDF, DOCX and TXT files are supported.";
  if (file.name.length > 200)
    return "The file name is too long (maximum 200 characters).";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return "This file is larger than 5 MB.";
  return null;
}
