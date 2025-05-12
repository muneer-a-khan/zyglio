import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
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
          <div>
            <Button variant="default">Sign In</Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  Introducing VoiceProc
                </div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-6xl/none">
                  Voice-Based Procedural Skills Documentation
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl">
                  Capture, refine, and simulate procedural tasks using voice commands. 
                  Our AI-powered platform makes documentation simple and effective.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row flex-wrap">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/create">Create New Procedure</Link>
                  </Button>
                  <Button variant="outline">
                    <Link href="/media">Browse Media Library</Link>
                  </Button>
                  <Button variant="secondary">
                    <Link href="/procedures">Browse Procedural Library</Link>
                  </Button>
                </div>
              </div>
              <div className="lg:pl-10">
                <div className="rounded-xl overflow-hidden border shadow-lg">
                  <img
                    alt="Healthcare professional documenting a procedure"
                    className="aspect-video object-cover w-full"
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-12 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">How It Works</h2>
              <p className="text-gray-500 mt-2">Streamlined process for capturing procedural skills</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Define Your Task",
                  description: "Start by defining your procedure, including key performance indicators and objectives.",
                  icon: (
                    <div className="p-3 bg-blue-100 rounded-full inline-block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-blue-600"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  ),
                },
                {
                  title: "Capture Voice Instructions",
                  description: "Use voice commands to record step-by-step procedures with our AI assistant enhancing your input.",
                  icon: (
                    <div className="p-3 bg-blue-100 rounded-full inline-block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-blue-600"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </div>
                  ),
                },
                {
                  title: "Visualize & Simulate",
                  description: "Automatically generate interactive flowcharts and simulations from your voice recordings.",
                  icon: (
                    <div className="p-3 bg-blue-100 rounded-full inline-block">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-blue-600"
                      >
                        <rect width="6" height="16" x="4" y="4" rx="2" />
                        <rect width="6" height="9" x="14" y="4" rx="2" />
                        <rect width="6" height="4" x="14" y="16" rx="2" />
                        <path d="M10 10h4" />
                        <path d="M10 18h4" />
                      </svg>
                    </div>
                  ),
                },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  {item.icon}
                  <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-gray-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-100 py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
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
            </div>
            <p className="text-sm text-gray-500">
              © 2025 VoiceProc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
