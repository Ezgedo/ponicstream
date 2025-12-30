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
                    scope: "openid user:read:email chat:read chat:edit channel:moderate moderator:manage:chat_messages moderator:manage:banned_users user:read:emotes",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            if (account) {
                token.accessToken = account.access_token;
                token.id = user?.id || token.sub; // user.id is usually the provider ID (Twitch ID)
            }
            return token
        },
        async session({ session, token }: any) {
            session.accessToken = token.accessToken;
            session.user.id = token.id;
            session.clientId = process.env.TWITCH_CLIENT_ID;
            return session
        },
    },
    debug: true,
}

