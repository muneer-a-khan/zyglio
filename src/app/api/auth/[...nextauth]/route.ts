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

          if (error || !data.user) {
            return null;
          }

          // Check if user exists in Prisma, if not create the user
          let user = await prisma.user.findUnique({
            where: { id: data.user.id }
          });

          if (!user) {
            // User doesn't exist in Prisma yet, create them
            user = await prisma.user.create({
              data: {
                id: data.user.id,
                email: data.user.email!,
                name: data.user.email?.split('@')[0] || 'User',
              }
            });
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: user.name || data.user.email?.split('@')[0] || 'User',
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
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 