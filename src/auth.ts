import { NextAuthOptions } from "next-auth"
import TwitchProvider from "next-auth/providers/twitch"

if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is missing. Please check your .env.local file.");
}

export const authOptions: NextAuthOptions = {
    providers: [
        TwitchProvider({
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid user:read:email chat:read chat:edit",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken
            return session
        },
    },
    debug: true,
}

