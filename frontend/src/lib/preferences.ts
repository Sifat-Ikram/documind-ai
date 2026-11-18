export const APPEARANCE_STORAGE_KEY = "documind-appearance";

export type Theme = "light" | "dark" | "system";

export interface Appearance {
  theme: Theme;
  density: "comfortable" | "compact";
  textSize: "normal" | "large";
  reduceMotion: boolean;
}

export interface AiPreferences {
  language: string; // "auto" = the language of the request
  length: "short" | "medium" | "detailed";
  style: "standard" | "simple" | "detailed" | "technical";
  tone: "neutral" | "formal" | "friendly";
  format: "paragraphs" | "bullets";
}

export interface DocumentPreferences {
  afterUpload: "stay" | "open_details" | "open_analyze";
  exportFormat: "pdf" | "docx" | "txt";
  defaultCollectionId: string | null;
  confirmBeforeTrash: boolean;
}

// Documents page: view, sort, items per page
export interface ViewPreferences {
  mode: "grid" | "list";
  sort: "createdAt" | "updatedAt" | "name" | "size";
  order: "asc" | "desc";
  perPage: 12 | 24 | 48;
}

export interface Preferences {
  appearance: Appearance;
  ai: AiPreferences;
  documents: DocumentPreferences;
  view: ViewPreferences;
}

export type PreferencesPatch = {
  [K in keyof Preferences]?: Partial<Preferences[K]>;
};

export const DEFAULT_PREFERENCES: Preferences = {
  appearance: {
    theme: "system",
    density: "comfortable",
    textSize: "normal",
    reduceMotion: false,
  },
  ai: {
    language: "auto",
    length: "medium",
    style: "standard",
    tone: "neutral",
    format: "paragraphs",
  },
  documents: {
    afterUpload: "stay",
    exportFormat: "pdf",
    defaultCollectionId: null,
    confirmBeforeTrash: true,
  },
  view: { mode: "grid", sort: "createdAt", order: "desc", perPage: 12 },
};

export function mergePreferences(
  base: Preferences,
  patch: PreferencesPatch,
): Preferences {
  return {
    appearance: { ...base.appearance, ...patch.appearance },
    ai: { ...base.ai, ...patch.ai },
    documents: { ...base.documents, ...patch.documents },
    view: { ...base.view, ...patch.view },
  };
}

/** The last appearance on this device. Used before the server answers and on public pages. */
export function readStoredAppearance(): Appearance {
  const d = DEFAULT_PREFERENCES.appearance;
  if (typeof window === "undefined") return d;
  try {
    const raw = JSON.parse(
      window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}",
    ) as Partial<Appearance>;
    return {
      theme:
        raw.theme === "light" || raw.theme === "dark" ? raw.theme : "system",
      density: raw.density === "compact" ? "compact" : "comfortable",
      textSize: raw.textSize === "large" ? "large" : "normal",
      reduceMotion: raw.reduceMotion === true,
    };
  } catch {
    return d;
  }
}

export function storeAppearance(a: Appearance): void {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(a));
  } catch {
    // storage can be blocked, the setting still applies for this visit
  }
}

export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  const dark =
    a.theme === "dark" ||
    (a.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.density = a.density;
  root.dataset.textSize = a.textSize;
  root.dataset.motion = a.reduceMotion ? "reduce" : "full";
}

/** Runs in <head> before the page is drawn, so there is no flash of the wrong theme. */
export const themeInitScript = `(function(){var d=document.documentElement,a={};try{a=JSON.parse(localStorage.getItem('${APPEARANCE_STORAGE_KEY}')||'{}')||{}}catch(e){}var t=a.theme==='light'||a.theme==='dark'?a.theme:'system';var dark=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light';d.dataset.density=a.density==='compact'?'compact':'comfortable';d.dataset.textSize=a.textSize==='large'?'large':'normal';d.dataset.motion=a.reduceMotion===true?'reduce':'full';})();`;
