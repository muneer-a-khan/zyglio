import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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

        // Only attempt to fetch user if we have an ID
        if (token?.sub || token?.id) {
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