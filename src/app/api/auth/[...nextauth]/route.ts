import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/integrations/supabase/client";
import prisma from "@/lib/prisma";

// Define the auth options
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
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
          let user = await prisma.users.findUnique({
            where: { email: credentials.email }
          });

          // If user doesn't exist in our database, create them
          if (!user) {
            try {
              user = await prisma.users.create({
                data: {
                  id: data.user.id,  // Use the Supabase user ID
                  email: credentials.email,
                  name: data.user.user_metadata?.name || credentials.email.split('@')[0] || 'User',
                }
              });
              console.log("Created new user in database:", user.id);
            } catch (createError) {
              console.error("Error creating user in database:", createError);
              // If we can't create the user, we still want to continue with the auth flow
              // We'll just return the Supabase user and hope for the best
            }
          } else {
            console.log("Found existing user in database:", user.id);
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 