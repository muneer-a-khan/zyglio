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

          // Check if user exists in Prisma
          let user = await prisma.user.findUnique({
            where: { id: data.user.id }
          });

          // If user doesn't exist in Prisma but exists in Supabase Auth, create the user in Prisma
          if (!user) {
            try {
              user = await prisma.user.create({
                data: {
                  id: data.user.id,
                  email: data.user.email!,
                  name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                }
              });
              console.log("Created new user in Prisma:", user.id);
            } catch (createError) {
              console.error("Error creating user in Prisma:", createError);
              // Continue with auth even if Prisma creation fails
            }
          }

          // Return the user for NextAuth
          return {
            id: data.user.id,
            email: data.user.email,
            name: user?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
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