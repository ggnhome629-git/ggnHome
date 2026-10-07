import {
  Building2,
  Settings,
  ClipboardList,
  CreditCard,
  Gift,
  Gauge,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PhoneCall,
  Smartphone,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

/**
 * One source of truth for admin navigation (PART 4 of the admin upgrade
 * spec). The rail, the mobile drawer and the command palette all render from
 * this list, and screens are grouped the way Material 3 recommends: a small
 * number of groups, 3-7 destinations each, labels always visible.
 *
 * `permission` is optional and read by AdminLayout — the backend still ships
 * a single "admin" role today, so nothing is locked yet, but adding
 * `permission: "admins:manage"` to an item is all it takes once super-admin
 * roles land (PART 6).
 */
export const ADMIN_NAV = [
  {
    group: "Overview",
    items: [
      { id: "home", label: "Home", route: "/admin/Landingpage", icon: Home },
      { id: "dashboard", label: "Dashboard", route: "/admin/Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Listings",
    items: [
      { id: "properties", label: "Property Manager", route: "/admin/propertymanager", icon: Building2 },
      { id: "browse", label: "All Properties", route: "/admin/rewardsproperties", icon: Home },
      { id: "add-property", label: "Add Property", route: "/admin/add-property", icon: Building2 },
    ],
  },
  {
    group: "People",
    items: [
      { id: "users", label: "Users", route: "/admin/UserManagement", icon: Users },
      { id: "agents", label: "Agents", route: "/admin/agentsmanagement", icon: Users },
      { id: "register-agent", label: "Register Agent", route: "/admin/agent-registration", icon: UserPlus },
    ],
  },
  {
    group: "Leads",
    items: [
      { id: "enquiries", label: "Enquiries", route: "/admin/enquiries", icon: MessageSquare },
      { id: "callbacks", label: "Callback Requests", route: "/admin/callback", icon: PhoneCall },
      { id: "preferences", label: "Preference Forms", route: "/admin/userpreferenceformresponses", icon: ClipboardList },
      { id: "services", label: "Services", route: "/admin/services", icon: Wrench },
    ],
  },
  {
    group: "Marketing",
    items: [
      { id: "promos", label: "Promo Cards", route: "/admin/promos", icon: Megaphone },
      { id: "rewards", label: "Rewards", route: "/admin/rewards", icon: Gift },
    ],
  },
  {
    group: "Money",
    items: [{ id: "payments", label: "Payments", route: "/admin/payments", icon: CreditCard }],
  },
  {
    group: "System",
    items: [
      { id: "sms", label: "SMS Phones", route: "/admin/sms-devices", icon: Smartphone },
      { id: "usage", label: "Usage & Limits", route: "/admin/usagetrack", icon: Gauge },
      { id: "settings", label: "Settings", route: "/admin/settings", icon: Settings },
    ],
  },
];

/** Flat list for search / palette lookups. */
export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((section) =>
  section.items.map((item) => ({ ...item, group: section.group }))
);

/** Route -> { group, label } for breadcrumbs; falls back to a prettified path. */
export function adminCrumb(pathname) {
  const exact = ADMIN_NAV_ITEMS.find((item) => item.route === pathname);
  if (exact) return { group: exact.group, label: exact.label };
  const prefix = ADMIN_NAV_ITEMS.filter((item) => pathname.startsWith(item.route)).sort(
    (a, b) => b.route.length - a.route.length
  )[0];
  if (prefix) return { group: prefix.group, label: prefix.label };
  const tail = pathname.split("/").filter(Boolean).pop() || "Admin";
  return {
    group: "Admin",
    label: tail
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}
