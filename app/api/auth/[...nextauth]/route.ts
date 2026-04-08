import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Busca o usuário via RPC (bypasses PostgREST cache)
        const { data: user, error } = await supabase.rpc("find_user_by_email", {
          p_email: credentials.email,
        });

        console.log("[AUTH] Query result:", { error: error?.message, userFound: !!user, email: credentials.email });

        if (error || !user) {
          console.log("[AUTH] User not found or query error");
          return null;
        }

        // Em produção, use bcrypt para comparar hashes
        // Por enquanto, comparação direta para desenvolvimento
        const isValid = user.password_hash === credentials.password;
        console.log("[AUTH] Password check:", { isValid, hashLen: user.password_hash?.length, passLen: credentials.password.length });
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
