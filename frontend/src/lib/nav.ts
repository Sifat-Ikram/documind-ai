import type { IconType } from "react-icons";
import {
  FiArchive,
  FiClock,
  FiFileText,
  FiFolder,
  FiGrid,
  FiHome,
  FiRepeat,
  FiRotateCcw,
  FiSettings,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  soon?: boolean;
}

export const HOME_ITEM: NavItem = {
  href: "/",
  label: "Home",
  icon: FiHome,
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: FiGrid },
  { href: "/documents", label: "My Documents", icon: FiFileText },
  { href: "/collections", label: "Collections", icon: FiFolder },
  { href: "/converter", label: "Document Converter", icon: FiRepeat },
  { href: "/archive", label: "Archive", icon: FiArchive },
  { href: "/shared", label: "Shared with Me", icon: FiShare2 },
  { href: "/recent", label: "Recent", icon: FiClock },
  { href: "/history", label: "Analysis History", icon: FiRotateCcw },
  { href: "/trash", label: "Trash", icon: FiTrash2 },
  { href: "/settings", label: "Settings", icon: FiSettings },
];

export const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
