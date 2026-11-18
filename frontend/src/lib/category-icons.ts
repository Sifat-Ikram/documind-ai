import type { IconType } from "react-icons";
import {
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiDollarSign,
  FiEdit3,
  FiFile,
  FiMail,
  FiUser,
  FiUsers,
} from "react-icons/fi";

// The server stores the icon name as text. This maps it to the real icon.
const ICONS: Record<string, IconType> = {
  FiEdit3,
  FiBarChart2,
  FiDollarSign,
  FiUser,
  FiMail,
  FiUsers,
  FiBriefcase,
  FiBookOpen,
  FiFile,
};

export function categoryIcon(name: string | null | undefined): IconType {
  return (name && ICONS[name]) || FiFile;
}
