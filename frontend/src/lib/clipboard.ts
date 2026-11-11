import { toast } from "sonner";

export async function copyText(
  text: string,
  successMessage = "Copied to clipboard",
) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy. Select the text and copy it manually.");
  }
}
