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
    // Colors
    textColor: "#ffffff",
    backgroundColor: "#000000",
    backgroundImage: "",
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
    timestampColor: "#999999",
    timestampFontSize: 12,
    timestampIsBold: false,

    // Advanced Styling
    padding: 12,
    containerPadding: 16,
    margin: 8,
    bgOpacity: 70,
    borderRadiusTL: 8,
    borderRadiusTR: 8,
    borderRadiusBL: 8,
    borderRadiusBR: 8,

    // Background Modes
    msgBgMode: 'solid',
    msgBgCycleColors: ['#FF0000', '#00FF00', '#0000FF'],
    msgBgCycleCount: 3,
    msgBgRoleColors: {
        broadcaster: '#FFD700',
        moderator: '#00E676',
        vip: '#E040FB',
        subscriber: '#651FFF',
        viewer: '#757575',
    },

    // Text Visibility
    textOutlineEnabled: false,
    textOutlineColor: '#000000',

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
            if (searchParams.get("backgroundImage")) urlStyles.backgroundImage = searchParams.get("backgroundImage")!;
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
            if (searchParams.get("timestampColor")) urlStyles.timestampColor = searchParams.get("timestampColor")!;
            if (searchParams.get("timestampFontSize")) urlStyles.timestampFontSize = Number(searchParams.get("timestampFontSize"));
            if (searchParams.get("timestampIsBold")) urlStyles.timestampIsBold = searchParams.get("timestampIsBold") === "true";

            // Advanced Styling URL Params
            if (searchParams.get("padding")) urlStyles.padding = Number(searchParams.get("padding"));
            if (searchParams.get("containerPadding")) urlStyles.containerPadding = Number(searchParams.get("containerPadding"));
            if (searchParams.get("margin")) urlStyles.margin = Number(searchParams.get("margin"));
            if (searchParams.get("bgOpacity")) urlStyles.bgOpacity = Number(searchParams.get("bgOpacity"));
            if (searchParams.get("borderRadiusTL")) urlStyles.borderRadiusTL = Number(searchParams.get("borderRadiusTL"));
            if (searchParams.get("borderRadiusTR")) urlStyles.borderRadiusTR = Number(searchParams.get("borderRadiusTR"));
            if (searchParams.get("borderRadiusBL")) urlStyles.borderRadiusBL = Number(searchParams.get("borderRadiusBL"));
            if (searchParams.get("borderRadiusBR")) urlStyles.borderRadiusBR = Number(searchParams.get("borderRadiusBR"));

            // Background Mode Params
            if (searchParams.get("msgBgMode")) urlStyles.msgBgMode = searchParams.get("msgBgMode") as any;
            if (searchParams.get("msgBgCycleCount")) urlStyles.msgBgCycleCount = Number(searchParams.get("msgBgCycleCount")) as any;

            // Parse Cycle Colors (cycleColor_0, cycleColor_1, etc.)
            const cycleColors: string[] = [];
            let i = 0;
            while (searchParams.get(`cycleColor_${i}`)) {
                cycleColors.push(searchParams.get(`cycleColor_${i}`)!);
                i++;
            }
            if (cycleColors.length > 0) urlStyles.msgBgCycleColors = cycleColors;

            // Parse Role Colors (roleColor_broadcaster, etc.)
            const roleColors: Partial<ChatStyles['msgBgRoleColors']> = {};
            if (searchParams.get("roleColor_broadcaster")) roleColors.broadcaster = searchParams.get("roleColor_broadcaster")!;
            if (searchParams.get("roleColor_moderator")) roleColors.moderator = searchParams.get("roleColor_moderator")!;
            if (searchParams.get("roleColor_vip")) roleColors.vip = searchParams.get("roleColor_vip")!;
            if (searchParams.get("roleColor_subscriber")) roleColors.subscriber = searchParams.get("roleColor_subscriber")!;
            if (searchParams.get("roleColor_viewer")) roleColors.viewer = searchParams.get("roleColor_viewer")!;
            if (Object.keys(roleColors).length > 0) urlStyles.msgBgRoleColors = { ...DEFAULT_STYLES.msgBgRoleColors, ...roleColors } as any;

            if (searchParams.get("textOutlineEnabled")) urlStyles.textOutlineEnabled = searchParams.get("textOutlineEnabled") === "true";
            if (searchParams.get("textOutlineColor")) urlStyles.textOutlineColor = searchParams.get("textOutlineColor")!;

            // Merge: Default -> URL -> LocalStorage (LocalStorage wins for live updates)
            // Merge: Default -> URL -> LocalStorage (LocalStorage wins for live updates)
            setStyles((prev) => ({
                ...DEFAULT_STYLES,
                ...urlStyles,
                ...localStyles,
                // Ensure deep merge for nested objects like msgBgRoleColors and badgeStyles
                // This prevents incomplete localStorage data (from older saves) from overwriting defaults with "undefined"
                msgBgRoleColors: { ...DEFAULT_STYLES.msgBgRoleColors, ...(localStyles.msgBgRoleColors || {}) },
                badgeStyles: { ...DEFAULT_STYLES.badgeStyles, ...(localStyles.badgeStyles || {}) },
            }));
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

        // Handle message deletion (single message)
        client.on("messagedeleted", (channel: string, username: string, deletedMessage: string, userstate: any) => {
            const targetId = userstate["target-msg-id"];
            if (targetId) {
                setMessages((prev) => prev.filter(m => m.id !== targetId));
            }
        });

        // Handle timeouts (remove all messages from user)
        client.on("timeout", (channel: string, username: string, reason: string, duration: number) => {
            setMessages((prev) => prev.filter(m => m.user.toLowerCase() !== username.toLowerCase()));
        });

        // Handle bans (remove all messages from user)
        client.on("ban", (channel: string, username: string, reason: string) => {
            setMessages((prev) => prev.filter(m => m.user.toLowerCase() !== username.toLowerCase()));
        });

        // Handle Clear Chat (remove all messages or all from specific user)
        client.on("clearchat", (channel: string) => {
            // If no username argument is provided by tmi.js (it might be null/undefined for clear all), clear everything.
            // Note: tmi.js docs say clearchat(channel) means clear all.
            setMessages([]);
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
