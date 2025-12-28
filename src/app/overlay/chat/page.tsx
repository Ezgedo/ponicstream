"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ChatBox, { ChatStyles, ChatMessageData } from "@/components/chat/ChatBox";
// @ts-ignore -- tmi.js types might be missing or tricky with strict mode
import tmi from "tmi.js";

const DEFAULT_STYLES: ChatStyles = {
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
    isBold: false,
    textColor: "#ffffff",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    accentColor: "#a855f7",
    useUserColorForAccent: false,
    useUserColorForName: true,
    borderRadius: 8,
    width: 400,
    height: 600,
    position: "bottom-left",
    direction: "down",
    maxMessages: 50,
    showTimestamp: false,

    // Advanced Styling
    padding: 12,
    margin: 8,
    bgOpacity: 70,
    borderRadiusTL: 8,
    borderRadiusTR: 8,
    borderRadiusBL: 8,
    borderRadiusBR: 8,

    // Badges
    showBadges: true,
    badgeStyles: {
        broadcaster: { type: 'icon', color: '#e91e63' },
        moderator: { type: 'icon', color: '#00e676' },
        vip: { type: 'icon', color: '#e040fb' },
        subscriber: { type: 'icon', color: '#651fff' },
    },

    // Moderation
    ignoredUsers: [],

    // Behavior
    autoHideSeconds: 0,
    animationEntry: "fade",
    animationExit: "fade",
};

import { Suspense } from "react";

function ChatOverlayContent() {
    const searchParams = useSearchParams();
    const [styles, setStyles] = useState<ChatStyles>(DEFAULT_STYLES);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const clientRef = useRef<any>(null);

    // 1. Load Styles & Listen for Changes
    useEffect(() => {
        const loadStyles = () => {
            // Priority: LocalStorage (Primary for real-time) -> URL Params (Backup/Snapshot)

            // 1. Try LocalStorage first
            const saved = localStorage.getItem("chatStyles");
            let localStyles: Partial<ChatStyles> = {};
            if (saved) {
                try {
                    localStyles = JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse saved styles", e);
                }
            }

            // 2. Parse URL Params
            const urlStyles: Partial<ChatStyles> = {};
            if (searchParams.get("fontFamily")) urlStyles.fontFamily = searchParams.get("fontFamily")!;
            if (searchParams.get("fontSize")) urlStyles.fontSize = Number(searchParams.get("fontSize"));
            if (searchParams.get("textColor")) urlStyles.textColor = searchParams.get("textColor")!;
            if (searchParams.get("backgroundColor")) urlStyles.backgroundColor = searchParams.get("backgroundColor")!;
            if (searchParams.get("accentColor")) urlStyles.accentColor = searchParams.get("accentColor")!;
            if (searchParams.get("borderRadius")) urlStyles.borderRadius = Number(searchParams.get("borderRadius"));
            if (searchParams.get("width")) urlStyles.width = Number(searchParams.get("width"));
            if (searchParams.get("height")) urlStyles.height = Number(searchParams.get("height"));
            if (searchParams.get("isBold")) urlStyles.isBold = searchParams.get("isBold") === "true";
            if (searchParams.get("useUserColorForAccent")) urlStyles.useUserColorForAccent = searchParams.get("useUserColorForAccent") === "true";
            if (searchParams.get("useUserColorForName")) urlStyles.useUserColorForName = searchParams.get("useUserColorForName") === "true";
            if (searchParams.get("position")) urlStyles.position = searchParams.get("position") as any;
            if (searchParams.get("autoHideSeconds")) urlStyles.autoHideSeconds = Number(searchParams.get("autoHideSeconds"));
            if (searchParams.get("animationEntry")) urlStyles.animationEntry = searchParams.get("animationEntry") as any;
            if (searchParams.get("animationExit")) urlStyles.animationExit = searchParams.get("animationExit") as any;
            if (searchParams.get("direction")) urlStyles.direction = searchParams.get("direction") as any;
            if (searchParams.get("maxMessages")) urlStyles.maxMessages = Number(searchParams.get("maxMessages"));
            if (searchParams.get("showTimestamp")) urlStyles.showTimestamp = searchParams.get("showTimestamp") === "true";

            // Advanced Styling URL Params
            if (searchParams.get("padding")) urlStyles.padding = Number(searchParams.get("padding"));
            if (searchParams.get("margin")) urlStyles.margin = Number(searchParams.get("margin"));
            if (searchParams.get("bgOpacity")) urlStyles.bgOpacity = Number(searchParams.get("bgOpacity"));
            if (searchParams.get("borderRadiusTL")) urlStyles.borderRadiusTL = Number(searchParams.get("borderRadiusTL"));
            if (searchParams.get("borderRadiusTR")) urlStyles.borderRadiusTR = Number(searchParams.get("borderRadiusTR"));
            if (searchParams.get("borderRadiusBL")) urlStyles.borderRadiusBL = Number(searchParams.get("borderRadiusBL"));
            if (searchParams.get("borderRadiusBR")) urlStyles.borderRadiusBR = Number(searchParams.get("borderRadiusBR"));

            // Merge: Default -> URL -> LocalStorage (LocalStorage wins for live updates)
            setStyles((prev) => ({ ...DEFAULT_STYLES, ...urlStyles, ...localStyles }));
        };

        loadStyles();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "chatStyles") {
                loadStyles();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [searchParams]);

    const stylesRef = useRef(styles);

    // Keep ref in sync with styles state
    useEffect(() => {
        stylesRef.current = styles;
    }, [styles]);

    // 2. Connect to Twitch
    useEffect(() => {
        let channel = searchParams.get("channel");

        // Fallback to localStorage if no URL param
        if (!channel) {
            const savedChannel = localStorage.getItem("twitchChannel");
            if (savedChannel) {
                channel = savedChannel;
            }
        }

        if (!channel) return;

        // Cleanup function handles previous client if any
        if (clientRef.current) {
            try {
                clientRef.current.disconnect();
            } catch (e) {
                console.warn("Error disconnecting previous client", e);
            }
        }

        const client = new tmi.Client({
            channels: [channel],
            connection: {
                secure: true,
                reconnect: true,
            },
        });

        client.connect().catch((err: any) => {
            console.warn("TMI Connection Error:", err);
        });

        client.on("message", (channel: string, tags: any, message: string, self: boolean) => {
            if (self) return;

            // Use ref to get latest styles without re-running effect
            const currentStyles = stylesRef.current;

            const newMessage: ChatMessageData = {
                id: tags.id || Date.now().toString(),
                user: tags["display-name"] || tags.username,
                message: message,
                color: tags.color || currentStyles.accentColor,
                timestamp: Date.now(),
                emotes: tags.emotes,
                badges: tags.badges,
            };

            setMessages((prev) => {
                const limit = currentStyles.maxMessages || 50;
                if (prev.some(m => m.id === newMessage.id)) return prev;

                const updated = [...prev, newMessage];
                if (updated.length > limit) return updated.slice(updated.length - limit);
                return updated;
            });
        });

        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                try {
                    clientRef.current.disconnect();
                } catch (e) { /* ignore */ }
                clientRef.current = null;
            }
        };
    }, [searchParams]);

    return (
        <div className="w-screen h-screen overflow-hidden bg-transparent">
            {/* If no channel is warning */}
            {!searchParams.get("channel") && typeof window !== 'undefined' && !localStorage.getItem("twitchChannel") && messages.length === 0 && (
                <div className="p-4 bg-red-500/20 text-red-200 m-4 rounded">
                    No channel specified. Add ?channel=NAME to URL or login to Dashboard.
                </div>
            )}
            <ChatBox styles={styles} messages={messages} />
        </div>
    );
}

export default function ChatOverlayPage() {
    return (
        <Suspense fallback={<div className="text-white p-4">Loading Overlay...</div>}>
            <ChatOverlayContent />
        </Suspense>
    );
}
