"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import tmi from "tmi.js";
import { translateToSpanish } from "@/utils/translation";

/**
 * HeadlessTranslationBot
 * This component has NO UI. It runs in the background of the application.
 * It connects to the user's Twitch chat and automatically translates 
 * non-Spanish messages, posting the translation back to chat.
 */
export default function TranslationBot() {
    const { data: session } = useSession();
    const clientRef = useRef<tmi.Client | null>(null);
    const lastReplyTimeRef = useRef<number>(0);
    const REPLY_COOLDOWN = 2000;

    useEffect(() => {
        // Only run if we have a session with an access token and a username
        if (session?.accessToken && session?.user?.name) {
            const channel = session.user.name.toLowerCase();

            // Cleanup previous connection if any
            if (clientRef.current) {
                clientRef.current.disconnect().catch(() => { });
            }

            const client = new tmi.Client({
                options: { debug: false },
                connection: {
                    reconnect: true,
                    secure: true,
                },
                identity: {
                    username: session.user.name,
                    password: `oauth:${session.accessToken}`,
                },
                channels: [channel],
            });

            client.connect().then(() => {
                console.log("[Bot] Connected to chat for headless translation");
            }).catch(err => {
                console.error("[Bot] Connection failed:", err);
            });

            client.on("message", async (targetChannel, tags, message, self) => {
                // Don't reply to ourselves or other bots if we can help it
                if (self) return;

                const now = Date.now();
                if (now - lastReplyTimeRef.current < REPLY_COOLDOWN) return;

                try {
                    const translated = await translateToSpanish(message);

                    if (translated) {
                        lastReplyTimeRef.current = Date.now();
                        const username = tags['display-name'] || tags.username;

                        // Action: Reply to chat with translation
                        await client.say(targetChannel, `@${username} (ES): ${translated}`);
                    }
                } catch (error) {
                    console.error("[Bot] Translation error:", error);
                }
            });

            clientRef.current = client;

            return () => {
                if (clientRef.current) {
                    clientRef.current.disconnect().catch(() => { });
                    clientRef.current = null;
                }
            };
        }
    }, [session?.accessToken, session?.user?.name]);

    // This component renders nothing
    return null;
}
