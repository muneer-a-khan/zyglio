'use client'

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function GlobalNavigation() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();

  // Force session update when status changes
  useEffect(() => {
    if (status === "authenticated" && !session?.user) {
      update();
    }
  }, [status, session, update]);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  // Base links for all users
  const baseLinks = [
    { href: '/create', label: 'New Procedure' },
    { href: '/procedures', label: 'Procedures' },
    { href: '/training', label: 'Training' },
    { href: '/certification', label: 'Certification' },
    { href: '/media', label: 'Media Library' },
    { href: '/dashboard', label: 'Dashboard' },
  ];
  
  // Add SME-specific links - use session data directly without mounted state
  const displayLinks = session?.user?.role === 'sme' 
    ? [...baseLinks, { href: '/sme/training', label: 'Review Training' }, { href: '/sme/dashboard', label: 'SME Dashboard' }]
    : baseLinks;

  return (
    <header className="border-b sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center max-w-7xl mx-auto px-2">
        <div className="mr-1 flex">
          <Link href="/" className="flex items-center space-x-1">
            <div className="flex items-center justify-center rounded-md bg-blue-600 h-7 w-7">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-white"
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
            <span className="font-semibold text-lg hidden sm:inline-block">Zyglio</span>
          </Link>
        </div>
        <nav className="flex items-center justify-between flex-1">
          <div className="flex space-x-0.5 md:space-x-1">
            {displayLinks.map((link) => (
              <Button 
                key={link.href}
                variant={isActive(link.href) ? "default" : "ghost"} 
                asChild 
                size="sm"
                className="text-xs md:text-sm font-medium whitespace-nowrap px-2 md:px-3"
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center space-x-2 ml-auto pl-1">
            {status === "loading" ? (
              <Button 
                size="sm" 
                variant="outline"
                className="opacity-50 text-xs px-2 py-1 h-7"
                disabled
              >
                Loading
              </Button>
            ) : session?.user ? (
              <div className="flex items-center space-x-1 md:space-x-2">
                <span className="text-xs md:text-sm text-gray-600 hidden sm:inline truncate max-w-[120px] md:max-w-[150px]">
                  Hi, {session.user.name || session.user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs px-2 py-1 h-7"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 h-7"
                asChild
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
} 