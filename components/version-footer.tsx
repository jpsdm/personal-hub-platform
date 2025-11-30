"use client";

import { APP_VERSION } from "@/lib/version";

export function VersionFooter() {
  return (
    <div className="fixed bottom-3 left-3 z-50">
      <span className="text-xs text-muted-foreground/60 font-mono">
        v{APP_VERSION}
      </span>
    </div>
  );
}
