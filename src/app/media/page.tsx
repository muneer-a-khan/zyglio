"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MediaItem } from "@/lib/ProcedureService";
import MediaGallery from "@/components/MediaGallery";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function MediaLibrary() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load media items from the API
  useEffect(() => {
    const fetchMediaItems = async () => {
      if (status !== "authenticated") return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/media');
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("API Error:", errorData);
          throw new Error(`Failed to fetch media items: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log("API Response:", data);
        
        if (data.success && Array.isArray(data.mediaItems)) {
          setMediaItems(data.mediaItems);
          setFilteredItems(data.mediaItems);
          
          if (data.mediaItems.length === 0) {
            toast.info('No media items found in your account');
          } else {
            toast.success(`Loaded ${data.mediaItems.length} media items`);
          }
        } else {
          throw new Error(data.message || 'Failed to get media data');
        }
      } catch (error) {
        console.error('Error fetching media items:', error);
        toast.error(`${error}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMediaItems();
  }, [status]);

  // Filter media items based on search term
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      const filtered = mediaItems.filter(item => 
        (item.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(mediaItems);
    }
  };

  // Handle delete media item
  const handleDeleteMedia = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete media item');
      }
      
      // Remove item from state
      const updatedItems = mediaItems.filter(item => item.id !== id);
      setMediaItems(updatedItems);
      setFilteredItems(filteredItems.filter(item => item.id !== id));
      
      toast.success('Media item deleted successfully');
    } catch (error) {
      console.error('Error deleting media item:', error);
      toast.error('Failed to delete media item');
    }
  };

  // Function to retry loading
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      toast.info('Refreshing media items...');
      
      // Clear cache if any
      await fetch('/api/media/refresh-all', {
        method: 'POST',
      });
      
      // Reload items
      const response = await fetch('/api/media');
        
      if (!response.ok) {
        throw new Error('Failed to fetch media items');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.mediaItems)) {
        setMediaItems(data.mediaItems);
        setFilteredItems(data.mediaItems);
        toast.success(`Loaded ${data.mediaItems.length} media items`);
      } else {
        throw new Error(data.message || 'Failed to get media data');
      }
    } catch (error) {
      console.error('Error refreshing media items:', error);
      toast.error(`${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect to sign-in page via useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
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
              <span className="text-lg font-semibold">VoiceProc</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/procedures" className="text-sm font-medium hover:underline">
              Procedures
            </Link>
            <Link href="/media" className="text-sm font-medium hover:underline">
              Media Library
            </Link>
            <Link href="/create" className="text-sm font-medium hover:underline">
              Create
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {session?.user?.name && (
              <span className="text-sm text-gray-600">Hi, {session.user.name}</span>
            )}
            <Button 
              variant="default" 
              onClick={() => router.push('/auth/signout')}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Media Library</h1>
            <p className="text-gray-500">
              Manage and organize your procedure-related media files
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              disabled={isLoading}
            >
              Refresh Media
            </Button>
            
            <Button 
              onClick={() => router.push('/create?tab=media')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="mr-2 h-4 w-4" /> Upload New Media
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="search"
              placeholder="Search by caption or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">
              {mediaItems.length === 0 
                ? "No media files found. Upload some media to get started." 
                : "No media files match your search criteria."}
            </p>
            {mediaItems.length > 0 && (
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchTerm("");
                  setFilteredItems(mediaItems);
                }}
                className="mt-2"
              >
                Reset search
              </Button>
            )}
          </div>
        ) : (
          <MediaGallery 
            mediaItems={filteredItems} 
            onDelete={handleDeleteMedia}
            title="Your Media"
          />
        )}
      </main>
    </div>
  );
} 