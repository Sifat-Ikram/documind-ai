import type { IconType } from "react-icons";
import {
  FiArchive,
  FiClock,
  FiFileText,
  FiFolder,
  FiGrid,
  FiHome,
  FiMessageSquare,
  FiRepeat,
  FiRotateCcw,
  FiSearch,
  FiSettings,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  /** The page is not built yet. It shows as "Soon" and cannot be opened. Remove this line when it is ready. */
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const HOME_ITEM: NavItem = { href: "/", label: "Home", icon: FiHome };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: FiGrid },
      { href: "/documents", label: "My Documents", icon: FiFileText },
      { href: "/recent", label: "Recent", icon: FiClock, soon: true },
      {
        href: "/collections",
        label: "Collections",
        icon: FiFolder,
        soon: true,
      },
    ],
  },
  {
    label: "Document Management",
    items: [
      { href: "/archive", label: "Archive", icon: FiArchive, soon: true },
      { href: "/trash", label: "Trash", icon: FiTrash2, soon: true },
      { href: "/shared", label: "Shared with Me", icon: FiShare2, soon: true },
    ],
  },
  {
    label: "AI Workspace",
    items: [
      { href: "/search", label: "AI Search", icon: FiSearch, soon: true },
      {
        href: "/converter",
        label: "Document Converter",
        icon: FiRepeat,
        soon: true,
      },
      {
        href: "/conversations",
        label: "AI Conversations",
        icon: FiMessageSquare,
        soon: true,
      },
    ],
  },
  {
    label: "Other",
    items: [
      { href: "/history", label: "Analysis History", icon: FiRotateCcw },
      { href: "/settings", label: "Settings", icon: FiSettings },
    ],
  },
];

export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
