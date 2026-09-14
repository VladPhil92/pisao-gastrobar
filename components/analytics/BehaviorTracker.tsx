"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  classifyBehaviorSurface,
  trackBehavior,
} from "@/lib/analytics/behavioral-client";

export function BehaviorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const surface = classifyBehaviorSurface(pathname);
    trackBehavior("page_view", { surface });

    if (pathname === "/menu") {
      trackBehavior("menu_view", { surface: "menu" });
      return;
    }

    if (pathname.startsWith("/menu/")) {
      const productSlug = pathname.split("/")[2];
      if (productSlug) {
        trackBehavior("product_view", {
          surface: "product",
          productSlug,
        });
      }
    }
  }, [pathname]);

  return null;
}
