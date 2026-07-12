"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches server data on an interval so dashboards stay live
// without a manual reload.
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
