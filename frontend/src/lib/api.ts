export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api";

// These endpoints never try to refresh the session after a 401
const NO_REFRESH = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
]);

type RefreshResult = "ok" | "expired" | "error";

let refreshing: Promise<RefreshResult> | null = null;
const expiredListeners = new Set<() => void>();

/** Called when the refresh token is no longer valid (the user must log in again). */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

/** One refresh at a time: many requests failing together share a single refresh call. */
function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) {
    refreshing = (async (): Promise<RefreshResult> => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, { method: "POST" });
        if (res.ok) return "ok";
        return res.status === 401 ? "expired" : "error";
      } catch {
        return "error";
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const hasBody = options.body !== undefined;
  try {
    return await fetch(`${BASE}${path}`, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      0,
      "Could not reach the server. Check your connection and try again.",
    );
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const body = (data ?? {}) as { message?: unknown; errors?: FieldError[] };
    const message =
      typeof body.message === "string"
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(", ")
          : res.statusText || "Request failed";
    throw new ApiError(res.status, message, body.errors);
  }
  return data as T;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && !NO_REFRESH.has(path)) {
    const result = await refreshSession();
    if (result === "ok") {
      res = await send(path, options); // retry once with the new access token
    } else if (result === "expired") {
      expiredListeners.forEach((listener) => listener());
    }
  }

  return parseResponse<T>(res);
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "Too many requests. Please wait a minute and try again.";
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
