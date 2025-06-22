'use client'

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function GlobalNavigation() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // Force session update when status changes
  useEffect(() => {
    if (status === "authenticated" && !session?.user) {
      update();
    }
  }, [status, session, update]);

  // Ensure we're on the client side to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isActive = (path: string) => {
    if (!isClient) return false; // Prevent hydration mismatch
    return pathname === path;
  };

  return (
    <header className="border-b sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center max-w-7xl mx-auto px-4">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center rounded-md bg-blue-600 h-8 w-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 11V9a2 2 0 0 0-2-2H8.5L3 3v18l5.5-4H17a2 2 0 0 0 2-2v-2" />
                <path d="M15 9h6" />
                <path d="M18 6v6" />
              </svg>
            </div>
            <span className="font-semibold text-xl hidden sm:inline-block">Zyglio</span>
          </Link>
        </div>
        <nav className="flex items-center justify-between flex-1">
          <div className="flex space-x-1">
            <Button 
              variant={isActive('/create') ? "default" : "ghost"} 
              asChild 
              className="text-sm font-medium"
            >
              <Link href="/create">New Procedure</Link>
            </Button>
            <Button 
              variant={isActive('/procedures') ? "default" : "ghost"} 
              asChild 
              className="text-sm font-medium"
            >
              <Link href="/procedures">Procedures</Link>
            </Button>
            <Button 
              variant={isActive('/training') ? "default" : "ghost"} 
              asChild 
              className="text-sm font-medium"
            >
              <Link href="/training">Training</Link>
            </Button>
            {isClient && session?.user?.role === 'sme' && (
              <Button 
                variant={isActive('/sme/training') ? "default" : "ghost"} 
                asChild 
                className="text-sm font-medium"
              >
                <Link href="/sme/training">Review Training</Link>
              </Button>
            )}
            <Button 
              variant={isActive('/media') ? "default" : "ghost"} 
              asChild 
              className="text-sm font-medium"
            >
              <Link href="/media">Media Library</Link>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {isClient && session?.user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Hi, {session.user.name || session.user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign Out
                </Button>
              </div>
            ) : isClient ? (
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700"
                asChild
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            ) : (
              // Placeholder for SSR to prevent hydration mismatch
              <div className="w-20 h-8" />
            )}
          </div>
        </nav>
      </div>
    </header>
  );
} 