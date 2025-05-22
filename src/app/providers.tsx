"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import SystemCheck from "@/components/system-check";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SystemCheck />
      {children}
    </SessionProvider>
  );
} 