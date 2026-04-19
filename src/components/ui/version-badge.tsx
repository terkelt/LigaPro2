"use client";

import { APP_VERSION, APP_BUILD_DATE } from "@/lib/version";

export function VersionBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`text-[9px] text-muted-foreground/50 font-mono select-none ${className}`}
      title={`Liga Pro Fußballmanager v${APP_VERSION} (${APP_BUILD_DATE})`}
    >
      v{APP_VERSION}
    </div>
  );
}
