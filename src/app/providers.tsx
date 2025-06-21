"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SystemCheck from "@/components/system-check";
import GlobalNavigation from "@/components/global-navigation";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SystemCheck />
      <GlobalNavigation />
      {children}
    </SessionProvider>
  );
} 