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
          // Cari user di database - TAMBAHKAN image
          const { data: user, error } = await supabase
            .from("users")
            .select("id, email, password_hash, name, image, provider")
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
            image: user.image || null,
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
                image: user.image || null,
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
    
    // ✅ JWT Callback - Handle trigger "update" dan session dari DB
    async jwt({ token, user, account, trigger, session }) {
      // Saat pertama kali login
      if (account && user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
        token.picture = user.image // untuk compatibility
      }
      
      // ✅ CRITICAL: Saat ada update() dipanggil dari client
      if (trigger === "update" && session?.user) {
        // Ambil data terbaru dari database
        try {
          const { data: userData, error } = await supabase
            .from("users")
            .select("id, email, name, image")
            .eq("email", token.email)
            .single()

          if (!error && userData) {
            // Update token dengan data dari database
            token.name = userData.name
            token.email = userData.email
            token.image = userData.image
            token.picture = userData.image
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
        
        // Juga merge dengan data yang dikirim dari client (jika ada)
        if (session.user.name) token.name = session.user.name
        if (session.user.email) token.email = session.user.email
        if (session.user.image) {
          token.image = session.user.image
          token.picture = session.user.image
        }
      }
      
      return token
    },
    
    // ✅ Session Callback - Pass data dari token ke session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.image as string || token.picture as string
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