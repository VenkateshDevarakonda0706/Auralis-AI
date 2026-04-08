import { getServerSession } from "next-auth"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { ensureUserPreferences, findUserByEmail, getOrCreateGoogleUser, findUserById } from "@/lib/server/auth-repository"
import { toPublicDbError } from "@/lib/server/db-errors"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Email and password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const email = credentials?.email?.trim().toLowerCase()
                    const password = credentials?.password

                    if (!email || !password) {
                        return null
                    }

                    const user = await findUserByEmail(email)
                    if (!user?.password) {
                        return null
                    }

                    const passwordMatches = await bcrypt.compare(password, user.password)
                    if (!passwordMatches) {
                        return null
                    }

                    await ensureUserPreferences(user.id)

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image || undefined,
                    }
                } catch (error) {
                    const dbError = toPublicDbError(error)
                    console.error("Credentials authorize failed:", dbError.message)
                    return null
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }) {
            const userId = token.id || token.sub
            if (session.user && userId) {
                session.user.id = userId
                try {
                    const dbUser = await findUserById(userId)
                    if (dbUser) {
                        session.user.name = dbUser.name
                        session.user.email = dbUser.email
                        session.user.image = dbUser.image || session.user.image || undefined
                    } else {
                        if (token.name) {
                            session.user.name = token.name
                        }
                        if (token.email) {
                            session.user.email = token.email
                        }
                    }
                } catch {
                    if (token.name) {
                        session.user.name = token.name
                    }
                    if (token.email) {
                        session.user.email = token.email
                    }
                }
            }

            return session
        },
        async jwt({ token, user, account, profile }) {
            if (user?.id) {
                token.id = user.id
                token.sub = user.id
            }

            if (account?.provider === "google") {
                const email = token.email || user?.email || (profile as { email?: string } | undefined)?.email
                if (email) {
                    try {
                        const googleUser = await getOrCreateGoogleUser({
                            name: token.name || user?.name || email.split("@")[0],
                            email,
                            googleId: account.providerAccountId,
                            image: (profile as { picture?: string } | undefined)?.picture || user?.image || null,
                        })
                        await ensureUserPreferences(googleUser.id)
                        token.id = googleUser.id
                        token.sub = googleUser.id
                        token.name = googleUser.name
                        token.email = googleUser.email
                    } catch (error) {
                        const dbError = toPublicDbError(error)
                        console.error("Google user sync failed:", dbError.message)
                    }
                }
            }

            return token
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}

export const getAuthSession = () => getServerSession(authOptions)
