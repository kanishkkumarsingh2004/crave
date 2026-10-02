"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  Truck,
  Package,
  Tag,
  ShoppingBag,
  MapPin,
  CreditCard,
  BarChart3,
  Star,
  Bell,
  Settings,
  ScrollText,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface NavGroup {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const navGroups: NavGroup[] = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/deliveries", label: "Deliveries", icon: MapPin },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/vendors", label: "Vendors", icon: Store },
      { href: "/drivers", label: "Drivers", icon: Truck },
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: Tag },
    ],
  },
  {
    title: "SYSTEM & INSIGHTS",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reviews", label: "Reviews", icon: Star },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col shadow-md select-none z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-border bg-gradient-to-r from-blue-50/70 via-background to-background">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Crave"
            className="w-10 h-10 object-contain rounded-xl shadow-md shadow-blue-500/20 bg-white ring-2 ring-blue-500/10"
          />
          <div>
            <span className="font-extrabold text-sm text-foreground block leading-tight tracking-tight">
              CRAVE Platform
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
              <span>Operations Core</span>
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            <ul className="space-y-0.5 mt-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch={true}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-bold scale-[1.01]"
                          : "text-muted-foreground hover:text-blue-700 hover:bg-blue-50/70"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-blue-700"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-border bg-muted/20 space-y-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              A
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate leading-tight">Admin User</p>
              <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Super Admin
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
