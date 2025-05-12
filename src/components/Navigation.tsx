
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <header className="border-b sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center rounded-md bg-medical-600 h-8 w-8">
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
            <span className="font-semibold text-xl hidden sm:inline-block">VoiceProc</span>
          </Link>
        </div>
        <nav className="flex-1 flex items-center justify-between">
          <div className="flex space-x-1">
            <Button variant="ghost" asChild className="text-sm font-medium">
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild className="text-sm font-medium">
              <Link to="/create">New Procedure</Link>
            </Button>
            <Button variant="ghost" asChild className="text-sm font-medium hidden sm:flex">
              <Link to="/library">Media Library</Link>
            </Button>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Help
            </Button>
            <Button size="sm" className="bg-medical-600 hover:bg-medical-700">
              Sign In
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
