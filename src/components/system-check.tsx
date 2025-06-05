"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function SystemCheck() {
  const { data: session, status } = useSession();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    async function checkUserRegistration() {
      if (status !== "authenticated" || !session?.user || hasChecked) {
        return;
      }
      
      try {
        // Call the sync endpoint to ensure user exists in database
        const response = await fetch('/api/auth/sync');
        const data = await response.json();
        
        if (data.success) {
          console.log("User registration verified:", data.message);
          if (data.message.includes("synced")) {
            toast.success("User registration synced successfully");
          }
        } else {
          console.error("User registration check failed:", data.message);
          toast.error("Could not verify user registration. Some features may not work.");
        }
      } catch (error) {
        console.error("Error checking user registration:", error);
      }
      
      setHasChecked(true);
    }
    
    checkUserRegistration();
  }, [session, status, hasChecked]);

  // This component doesn't render anything visible
  return null;
} 