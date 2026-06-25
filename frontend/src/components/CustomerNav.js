"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabClass, ui } from "@/lib/ui";
import { isAdmin, isCustomer } from "@/lib/redirect";

const GUEST_LINKS = [
  { href: "/", label: "Home", match: (path) => path === "/" },
];

const CUSTOMER_LINKS = [
  { href: "/", label: "Home", match: (path) => path === "/" },
  { href: "/order", label: "Place Order", match: (path) => path.startsWith("/order") },
  { href: "/account", label: "My Orders", match: (path) => path === "/account" },
  { href: "/profile", label: "Profile", match: (path) => path === "/profile" },
];

const PENDING_LINKS = [
  { href: "/", label: "Home", match: (path) => path === "/" },
  { href: "/profile", label: "Profile", match: (path) => path === "/profile" },
];

const ADMIN_LINKS = [
  { href: "/", label: "Home", match: (path) => path === "/" },
  { href: "/admin", label: "Admin Panel", match: (path) => path.startsWith("/admin") },
];

function getLinks(user) {
  if (!user) return GUEST_LINKS;
  if (isAdmin(user) && !isCustomer(user)) return ADMIN_LINKS;
  if (isCustomer(user)) return CUSTOMER_LINKS;
  return PENDING_LINKS;
}

export default function CustomerNav({ user }) {
  const pathname = usePathname() || "/";
  const links = getLinks(user);

  return (
    <nav aria-label="Site navigation" className="w-full">
      <div className={`${ui.navTabsScroll} max-w-full`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={tabClass(link.match(pathname))}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
