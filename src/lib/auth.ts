import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { isLocale, toLocale } from "@/i18n/config";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/auth/signup",
  },
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
          });

          if (!user || !user.password) return null;

          const passwordMatch = await compare(credentials.password, user.password);
          if (!passwordMatch) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            mustChangePassword: user.mustChangePassword,
            locale: toLocale(user.locale),
          };
        } catch (error) {
          console.error("[auth] Échec authorize (schéma BDD à jour ? npm run db:push) :", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.locale = user.locale;
      }

      // Credentials + JWT : toujours exposer un id stable (sub en secours)
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (trigger === "update" && session) {
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.mustChangePassword !== undefined) {
          token.mustChangePassword = session.mustChangePassword;
        }
        if (isLocale(session.locale)) {
          token.locale = session.locale;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const userId = (token.id ?? token.sub) as string | undefined;
        if (userId) {
          session.user.id = userId;
        }
        session.user.mustChangePassword = token.mustChangePassword === true;
        if (isLocale(token.locale)) {
          session.user.locale = token.locale;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
};
