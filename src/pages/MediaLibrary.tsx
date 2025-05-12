
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Upload, Grid, LayoutList, File, Image, Video } from "lucide-react";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  thumbnail?: string;
  dateAdded: string;
  size: string;
  tags: string[];
}

const mockMediaLibrary: MediaItem[] = [
  {
    id: '1',
    name: 'Chest X-ray Procedure.pdf',
    type: 'pdf',
    dateAdded: '2025-05-10',
    size: '2.4 MB',
    tags: ['radiology', 'chest', 'procedure']
  },
  {
    id: '2',
    name: 'IV Insertion Video',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    dateAdded: '2025-05-09',
    size: '45 MB',
    tags: ['nursing', 'intravenous', 'training']
  },
  {
    id: '3',
    name: 'Surgical Tool Diagram',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    dateAdded: '2025-05-08',
    size: '1.2 MB',
    tags: ['surgery', 'tools', 'equipment']
  },
  {
    id: '4',
    name: 'Patient Assessment Guidelines.pdf',
    type: 'pdf',
    dateAdded: '2025-05-05',
    size: '3.7 MB',
    tags: ['assessment', 'guidelines', 'patient care']
  },
  {
    id: '5',
    name: 'CPR Training Video',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1563213126-a4273aed2016?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    dateAdded: '2025-05-01',
    size: '78 MB',
    tags: ['CPR', 'resuscitation', 'emergency']
  },
  {
    id: '6',
    name: 'Anatomical Reference',
    type: 'image',
    thumbnail: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    dateAdded: '2025-04-28',
    size: '4.2 MB',
    tags: ['anatomy', 'reference', 'medical']
  },
];

const MediaLibrary = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(mockMediaLibrary);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      const filteredItems = mockMediaLibrary.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setMediaItems(filteredItems);
    } else {
      setMediaItems(mockMediaLibrary);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <File className="h-10 w-10 text-red-500" />;
      case 'image':
        return <Image className="h-10 w-10 text-blue-500" />;
      case 'video':
        return <Video className="h-10 w-10 text-purple-500" />;
      default:
        return <File className="h-10 w-10 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Media Library</h1>
            <p className="text-gray-500">
              Manage and organize your procedure-related media files
            </p>
          </div>
          
          <Button className="bg-medical-600 hover:bg-medical-700">
            <Upload className="mr-2 h-4 w-4" /> Upload New Media
          </Button>
        </div>
        
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
            <Input
              type="search"
              placeholder="Search files, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {mediaItems.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">No media files found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="aspect-video w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        {getIconForType(item.type)}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                      <span>{item.dateAdded}</span>
                      <span>{item.size}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mediaItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center">
                  <div className="mr-4">
                    {item.thumbnail ? (
                      <div className="h-16 w-16 rounded overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                        {getIconForType(item.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{item.dateAdded}</span>
                      <span>{item.size}</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MediaLibrary;
