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
        let isCancelled = false;
        const botId = Math.random().toString(36).substring(7);
        const LEADER_KEY = 'ponicstream_translator_leader_id';
        const HEARTBEAT_KEY = 'ponicstream_translator_leader_ts';

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

        // Leadership Heartbeat
        const updateHeartbeat = () => {
            if (isCancelled) return;
            const now = Date.now();
            const currentLeaderId = localStorage.getItem(LEADER_KEY);
            const lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0');

            // Claim leadership if empty, expired, or we are already the leader
            if (!currentLeaderId || (now - lastHeartbeat > 5000) || currentLeaderId === botId) {
                localStorage.setItem(LEADER_KEY, botId);
                localStorage.setItem(HEARTBEAT_KEY, now.toString());
            }
        };

        const heartbeatInterval = setInterval(updateHeartbeat, 2000);
        updateHeartbeat();

        const isLeader = () => localStorage.getItem(LEADER_KEY) === botId;

        // Listen for internal storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'ponicstream_translator_settings') {
                settings = loadSettings();
                console.log(`[Bot ${botId}] Settings updated`, settings);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        const handleCustomUpdate = () => {
            settings = loadSettings();
            console.log(`[Bot ${botId}] Settings updated (custom)`, settings);
        };
        window.addEventListener('ponicstream_translator_update', handleCustomUpdate);

        // Only run if we have a session with an access token and a username
        if (session?.accessToken && session?.user?.name) {
            const channel = session.user.name.toLowerCase();

            const client = new tmi.Client({
                options: { debug: false },
                connection: { reconnect: true, secure: true },
                identity: {
                    username: session.user.name,
                    password: `oauth:${session.accessToken}`,
                },
                channels: [channel],
            });

            client.connect().then(() => {
                if (isCancelled) {
                    client.disconnect();
                    return;
                }
                console.log(`[Bot ${botId}] Connected`);
            }).catch(err => {
                if (!isCancelled) console.error(`[Bot ${botId}] Connection failed`, err);
            });

            client.on("message", async (targetChannel, tags, message, self) => {
                if (self || isCancelled) return;

                // Only the leader replies
                if (!isLeader()) return;

                const now = Date.now();
                if (now - lastReplyTimeRef.current < REPLY_COOLDOWN) return;

                try {
                    const translated = await translateText(message, settings);
                    if (translated && !isCancelled) {
                        lastReplyTimeRef.current = Date.now();
                        const username = tags['display-name'] || tags.username;
                        const langLabel = settings.targetLanguage.toUpperCase();
                        await client.say(targetChannel, `@${username} (${langLabel}): ${translated}`);
                    }
                } catch (error) {
                    console.error("[Bot] Translation error:", error);
                }
            });

            clientRef.current = client;

            return () => {
                isCancelled = true;
                clearInterval(heartbeatInterval);
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('ponicstream_translator_update', handleCustomUpdate);
                if (clientRef.current) {
                    clientRef.current.disconnect().catch(() => { });
                    clientRef.current = null;
                }
                // If we were the leader, clean up so others can take over fast
                if (localStorage.getItem(LEADER_KEY) === botId) {
                    localStorage.removeItem(LEADER_KEY);
                }
            };
        }

        return () => {
            isCancelled = true;
            clearInterval(heartbeatInterval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('ponicstream_translator_update', handleCustomUpdate);
        };
    }, [session?.accessToken, session?.user?.name]);

    // This component renders nothing
    return null;
}
