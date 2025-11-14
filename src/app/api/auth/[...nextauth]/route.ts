import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import supabase from "@/lib/supabaseClient"

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
          return null
        }

        try {
          // Cari user di database
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, password_hash, name, provider")
            .eq("email", credentials.email)
            .eq("provider", "manual")
            .single()

          if (error || !user || !user.password_hash) {
            return null
          }

          // Verifikasi password
          const isValid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Cek apakah user sudah ada
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single()

          if (!existingUser) {
            // Buat user baru jika belum ada
            const { error } = await supabase
              .from("users")
              .insert({
                email: user.email!,
                name: user.name || user.email!.split("@")[0],
                provider: "google",
                password_hash: null,
              })

            if (error) {
              console.error("Error creating Google user:", error)
              return false
            }
          } else {
            // Update provider jika user sudah ada dengan provider manual
            const { data: currentUser } = await supabase
              .from("users")
              .select("provider")
              .eq("id", existingUser.id)
              .single()

            if (currentUser?.provider === "manual") {
              await supabase
                .from("users")
                .update({ provider: "google" })
                .eq("id", existingUser.id)
            }
          }
        } catch (error) {
          console.error("Google sign in error:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


