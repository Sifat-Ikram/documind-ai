import { ApiError, apiRaw, parseResponse } from "@/lib/api";

export type StreamOutcome = "done" | "error" | "aborted";

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/**
 * Sends a POST request and reads a Server-Sent Events stream.
 * Every `data:` frame is parsed and handed to `onEvent`.
 * The server sends typed events, so the caller decides what each type means.
 */
export async function streamEvents<T>(
  path: string,
  body: unknown,
  onEvent: (event: T) => void,
  signal: AbortSignal,
): Promise<StreamOutcome> {
  let res: Response;
  try {
    res = await apiRaw(path, { method: "POST", body, signal });
  } catch (err) {
    if (isAbort(err)) return "aborted";
    throw err;
  }

  if (!res.ok) await parseResponse<never>(res);
  if (!res.body) throw new ApiError(0, "The server sent an empty response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);

        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;

        try {
          onEvent(JSON.parse(line.slice(5).trim()) as T);
          received++;
        } catch {
          continue;
        }
      }
    }
  } catch (err) {
    if (isAbort(err)) return "aborted";
    throw err;
  }

  if (received === 0) {
    throw new ApiError(
      0,
      "The connection was interrupted before the server sent anything.",
    );
  }
  return "done";
}
