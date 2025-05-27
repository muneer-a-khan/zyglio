import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from 'next-auth/next';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/integrations/supabase/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Error in credentials authorization:", error);
          // Return null instead of throwing an error
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
    async jwt({ token, user, trigger, session: newSessionData }) {
      try {
        if (user) {
          return {
            ...token,
            id: user.id,
            name: user.name,
            email: user.email,
          };
        }

        // Only attempt to fetch user if we have an ID and prisma is available
        if ((token?.sub || token?.id) && prisma && typeof prisma.user?.findUnique === 'function') {
          const userIdToFetch = token.id || token.sub;
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userIdToFetch as string },
            });

            if (dbUser) {
              return {
                ...token,
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
              };
            }
          } catch (error) {
            console.error("Error fetching user in JWT callback:", error);
            // Continue with the existing token if DB lookup fails
          }
        }
        
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        // Return the token as is in case of error
        return token;
      }
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