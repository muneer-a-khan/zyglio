import { NextAuthOptions } from "next-auth";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from 'next-auth/next';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Authenticate with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            console.error("Supabase auth error:", error);
            return null;
          }

          if (!data?.user) {
            console.error("No user data returned from Supabase");
            return null;
          }

          // Ensure the user exists in our database
          let user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          // If user doesn't exist in our database, create them
          if (!user) {
            try {
              user = await prisma.user.create({
                data: {
                  id: data.user.id,  // Use the Supabase user ID
                  email: credentials.email,
                  name: data.user.user_metadata?.name || credentials.email.split('@')[0] || 'User',
                  role: 'trainee' // Set default role explicitly
                }
              });
              console.log("Created new user in database:", user.id, user.email);
            } catch (createError) {
              console.error("Error creating user in database:", createError);
              
              // Try to find the user again in case of race condition
              user = await prisma.user.findUnique({
                where: { email: credentials.email }
              });
              
              if (!user) {
                console.error("Failed to create or find user, aborting auth");
                return null;
              }
            }
          } else {
            console.log("Found existing user in database:", user.id, user.email);
          }

          // Return the user for NextAuth
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to home page
      if (url.startsWith(baseUrl + "/auth/signin") || url === baseUrl + "/create") {
        return baseUrl;
      }
      // Allow other internal redirects
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to home page
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch user role from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
          });
          token.role = dbUser?.role || 'trainee';
        } catch (error) {
          console.error('Error fetching user role:', error);
          token.role = 'trainee';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

/**
 * Get the user session for server components
 */
export async function getAuthSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting auth session:', error);
    return null;
  }
}

/**
 * Verify the user session from a request
 */
export async function verifySession(request: Request) {
  try {
    // Get session from Next-Auth
    const session = await getServerSession(authOptions);
    if (session) {
      console.log('Auth verified via Next.js session');
      return session;
    }

    // Fallback to checking auth header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Attempting to verify via Bearer token');
      const tokenSession = await verifyToken(token);
      if (tokenSession) {
        console.log('Auth verified via Bearer token');
        return tokenSession;
      }
    }

    // Check for cookie-based auth
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // Extract token from cookies
      const tokenCookie = cookieHeader.split(';')
        .find(c => 
          c.trim().startsWith('next-auth.session-token=') || 
          c.trim().startsWith('__Secure-next-auth.session-token=')
        );
      
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1];
        console.log('Attempting to verify via cookie token');
        const cookieSession = await verifyToken(token);
        if (cookieSession) {
          console.log('Auth verified via cookie token');
          return cookieSession;
        }
      }
    }

    // For server-side calls, accept any user for now
    // Remove this in production!
    if (request.headers.get('user-agent')?.includes('node')) {
      console.log('Auth bypassed for server-side API call');
      return { user: { id: 'server', email: 'server@example.com', name: 'Server' } };
    }

    console.log('No valid auth method found in request');
    // No valid session found
    return null;
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

/**
 * Verify a token with Supabase
 */
async function verifyToken(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return null;
    }
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || null
      }
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
} 