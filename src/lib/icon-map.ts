/**
 * Centralized icon map for platform icons
 * This avoids importing all of lucide-react (43MB) and only imports needed icons
 */

import {
  // Social
  Twitter,
  Youtube,
  Instagram,
  MessageSquare,
  MessageCircle,
  Send,
  Github,
  Music,
  Linkedin,
  Facebook,
  // AI
  Sparkles,
  Zap,
  Brain,
  Copy,
  // Communication
  Mail,
  Phone,
  // Data
  Database,
  FileText,
  Sheet,
  Calendar,
  // Payments
  CreditCard,
  Code,
  // Video & Media
  Volume2,
  Video,
  UserCircle,
  UserSquare,
  Cloud,
  // Tools
  Search,
  Target,
  Users,
  BarChart3,
  CheckSquare,
  ListChecks,
  FolderOpen,
  Figma,
  // Default
  Key,
  type LucideIcon,
} from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  // Social
  Twitter,
  Youtube,
  Instagram,
  MessageSquare,
  Send,
  Github,
  Music,
  Linkedin,
  Facebook,
  // AI
  Sparkles,
  Zap,
  Brain,
  Copy,
  // Communication
  Mail,
  MessageCircle,
  Phone,
  // Data
  Database,
  FileText,
  Sheet,
  Calendar,
  // Payments
  CreditCard,
  Code,
  // Video & Media
  Volume2,
  Video,
  UserCircle,
  UserSquare,
  Cloud,
  // Tools
  Search,
  Target,
  Users,
  BarChart3,
  CheckSquare,
  ListChecks,
  FolderOpen,
  Figma,
  // Default
  Key,
};

/**
 * Get icon component by name, fallback to Key icon
 */
export function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Key;
}
