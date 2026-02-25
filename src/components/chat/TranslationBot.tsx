"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import tmi from "tmi.js";
import { translateText, DEFAULT_TRANSLATOR_SETTINGS, TranslatorSettings } from "@/utils/translation";

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
        const loadSettings = () => {
            const saved = localStorage.getItem('ponicstream_translator_settings');
            if (saved) {
                try {
                    return JSON.parse(saved) as TranslatorSettings;
                } catch (e) {
                    console.error("Failed to parse settings", e);
                }
            }
            return DEFAULT_TRANSLATOR_SETTINGS;
        };

        let settings = loadSettings();

        // Listen for internal storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'ponicstream_translator_settings') {
                settings = loadSettings();
                console.log("[Bot] Settings updated from storage change", settings);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Custom event for same-window updates
        const handleCustomUpdate = () => {
            settings = loadSettings();
            console.log("[Bot] Settings updated from custom event", settings);
        };
        window.addEventListener('ponicstream_translator_update', handleCustomUpdate);

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
                    const translated = await translateText(message, settings);

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
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('ponicstream_translator_update', handleCustomUpdate);
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
