'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SessionDebugPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-4">Session Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded-md mb-4">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        <p><strong>Status:</strong> {status}</p>
      </div>

      {session ? (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <h2 className="text-lg font-semibold mb-2">Session Data</h2>
          <p><strong>User ID:</strong> {session.user?.id || 'Not available'}</p>
          <p><strong>Name:</strong> {session.user?.name || 'Not available'}</p>
          <p><strong>Email:</strong> {session.user?.email || 'Not available'}</p>
          <p><strong>Role:</strong> {session.user?.role || 'Not available'}</p>
          <pre className="mt-4 bg-gray-800 text-white p-4 rounded-md overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
          <h2 className="text-lg font-semibold mb-2">No Session</h2>
          <p>You are not currently signed in.</p>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Navigation Links</h2>
        <ul className="list-disc pl-5">
          <li><a href="/" className="text-blue-600 hover:underline">Home</a></li>
          <li><a href="/dashboard" className="text-blue-600 hover:underline">Trainee Dashboard</a></li>
          <li><a href="/sme/dashboard" className="text-blue-600 hover:underline">SME Dashboard</a></li>
        </ul>
      </div>
    </div>
  );
} 