"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export interface ChatStyles {
    // Font
    fontFamily: string;
    fontSize: number;
    isBold: boolean;

    // Colors
    textColor: string;
    backgroundColor: string;
    backgroundImage?: string;
    accentColor: string;
    useUserColorForAccent: boolean;
    useUserColorForName: boolean;

    // Shape
    borderRadius: number;

    // Layout
    width: number;
    height: number;
    messageLayout: 'block' | 'inline';
    position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center-left" | "center-right";
    direction: "up" | "down";
    maxMessages: number;

    showTimestamp: boolean;
    timestampColor: string;
    timestampFontSize: number;
    timestampIsBold: boolean;

    // Advanced Styling
    padding: number;
    containerPadding: number;
    margin: number;
    bgOpacity: number;
    borderRadiusTL: number;
    borderRadiusTR: number;
    borderRadiusBL: number;
    borderRadiusBR: number;

    // Background Modes
    msgBgMode: 'solid' | 'cycle' | 'role' | 'pride' | 'image' | 'transparent';
    msgBgCycleColors: string[]; // Up to 3 colors
    msgBgCycleCount: 2 | 3;
    msgBgRoleColors: {
        broadcaster: string;
        moderator: string;
        vip: string;
        subscriber: string;
        viewer: string;
    };

    // Text Visibility
    textOutlineEnabled: boolean;
    textOutlineColor: string; // e.g., 'black' or hex

    // Badges
    showBadges: boolean;
    badgeStyles: {
        broadcaster: { type: 'dot' | 'icon' | 'custom' | 'native', color: string, customUrl?: string };
        moderator: { type: 'dot' | 'icon' | 'custom' | 'native', color: string, customUrl?: string };
        vip: { type: 'dot' | 'icon' | 'custom' | 'native', color: string, customUrl?: string };
        subscriber: { type: 'dot' | 'icon' | 'custom' | 'native', color: string, customUrl?: string };
    };

    // Moderation
    ignoredUsers: string[];

    // Behavior
    autoHideSeconds: number; // 0 = never
    animationEntry: "fade" | "slide-up" | "slide-left" | "scale";
    animationExit: "fade" | "slide-down" | "slide-right" | "scale";

    // Borders
    borderEnabled?: boolean;
    borderThickness?: number;
    borderColor?: string;
    borderSides?: {
        top: boolean;
        right: boolean;
        bottom: boolean;
        left: boolean;
    };

    // Shadows
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowOpacity?: number;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
}

export interface ChatMessageData {
    id: string;
    user: string;
    message: string;
    color?: string; // Username color from Twitch
    timestamp: number;
    emotes?: { [key: string]: string[] }; // Twitch emote data
    badges?: { [key: string]: string }; // Twitch badges
}

interface ChatBoxProps {
    styles: ChatStyles;
    messages: ChatMessageData[];
}

export default function ChatBox({ styles, messages, isPreview = false, badgeMap }: { styles: ChatStyles, messages: ChatMessageData[], isPreview?: boolean, badgeMap?: Record<string, Record<string, string>> }) {
    const [visibleMessages, setVisibleMessages] = useState<ChatMessageData[]>([]);

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, opacity: number) => {
        let c: any;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + (opacity / 100) + ')';
        }
        return hex;
    };

    // Filter visibility based on auto-hide preference and ignored users
    useEffect(() => {
        const updateVisibility = () => {
            let filtered = messages;

            // Filter ignored users
            if (styles.ignoredUsers && styles.ignoredUsers.length > 0) {
                const ignoredLower = styles.ignoredUsers.map(u => u.toLowerCase());
                filtered = filtered.filter(msg => !ignoredLower.includes(msg.user.toLowerCase()));
            }

            // Auto-hide logic
            if (styles.autoHideSeconds > 0) {
                const now = Date.now();
                filtered = filtered.filter(msg => now - msg.timestamp < styles.autoHideSeconds * 1000);
            }

            // Limit max messages
            if (styles.maxMessages > 0) {
                filtered = filtered.slice(-styles.maxMessages);
            }

            setVisibleMessages(filtered);
        };

        updateVisibility();
        const interval = setInterval(updateVisibility, 1000);
        return () => clearInterval(interval);
    }, [messages, styles.ignoredUsers, styles.autoHideSeconds, styles.maxMessages]);

    // Helper to parse Twitch emotes
    const renderMessage = (msg: ChatMessageData) => {
        if (!msg.emotes) return msg.message;

        // Create a map of replacement ranges
        const replacements: { start: number; end: number; id: string }[] = [];
        Object.entries(msg.emotes).forEach(([id, positions]) => {
            positions.forEach(pos => {
                const [start, end] = pos.split('-').map(Number);
                replacements.push({ start, end: end + 1, id });
            });
        });

        // Sort by start position
        replacements.sort((a, b) => a.start - b.start);

        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;

        replacements.forEach((replacement, i) => {
            // Push text before the emote
            if (replacement.start > lastIndex) {
                nodes.push(msg.message.substring(lastIndex, replacement.start));
            }

            // Push the emote image
            nodes.push(
                <img
                    key={`${msg.id}-emote-${i}`}
                    src={`https://static-cdn.jtvnw.net/emoticons/v2/${replacement.id}/default/dark/1.0`}
                    srcSet={`https://static-cdn.jtvnw.net/emoticons/v2/${replacement.id}/default/dark/1.0 1x, https://static-cdn.jtvnw.net/emoticons/v2/${replacement.id}/default/dark/2.0 2x`}
                    alt=""
                    className="inline-block align-middle mx-1"
                    style={{ height: '1.2em' }} // Scale relative to font size
                />
            );

            lastIndex = replacement.end;
        });

        // Push remaining text
        if (lastIndex < msg.message.length) {
            nodes.push(msg.message.substring(lastIndex));
        }

        return nodes;
    };

    // Helper to format timestamp
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Position Styles
    const getPositionStyles = () => {
        const base: React.CSSProperties = {
            position: "absolute",
            width: `${styles.width}px`,
            height: `${styles.height}px`,
            padding: `${styles.containerPadding ?? 16}px`,
            display: "flex",
            overflow: "hidden", // Hide messages outside the box
        };

        if (styles.direction === "up") {
            base.flexDirection = "column-reverse";
            base.justifyContent = "flex-end";
        } else {
            base.flexDirection = "column";
            base.justifyContent = "flex-end";
        }

        switch (styles.position) {
            case "top-left": return { ...base, top: 0, left: 0 };
            case "top-center": return { ...base, top: 0, left: "50%", transform: "translateX(-50%)" };
            case "top-right": return { ...base, top: 0, right: 0 };
            case "center-left": return { ...base, top: "50%", left: 0, transform: "translateY(-50%)" };
            case "center-right": return { ...base, top: "50%", right: 0, transform: "translateY(-50%)" };
            case "bottom-left": return { ...base, bottom: 0, left: 0 };
            case "bottom-center": return { ...base, bottom: 0, left: "50%", transform: "translateX(-50%)" };
            case "bottom-right": return { ...base, bottom: 0, right: 0 };
            default: return { ...base, bottom: 0, left: 0 };
        }
    };

    // Animation Variants
    const getVariants = () => {
        const entry = styles.animationEntry;
        const exit = styles.animationExit;

        const variants = {
            initial: { opacity: 0, scale: 1, x: 0, y: 0 },
            animate: { opacity: 1, scale: 1, x: 0, y: 0 },
            exit: { opacity: 0, scale: 1, x: 0, y: 0 },
        };

        // Entry
        if (entry === "slide-up") variants.initial.y = 20;
        if (entry === "slide-left") variants.initial.x = -20;
        if (entry === "scale") variants.initial.scale = 0.8;

        // Exit
        if (exit === "slide-down") variants.exit.y = 20;
        if (exit === "slide-right") variants.exit.x = 20;
        if (exit === "scale") variants.exit.scale = 0.8;

        return variants;
    };

    // Helper to determine background color based on mode
    const getMessageBackground = (msg: ChatMessageData, index: number) => {
        // 1. Background Image overrides everything IF mode is image
        if (styles.msgBgMode === 'image' && styles.backgroundImage) return 'transparent';

        // 2. Transparent Mode
        if (styles.msgBgMode === 'transparent') return 'transparent';

        let color = styles.backgroundColor; // Default to solid/base color

        // 2. Handle Modes
        if (styles.msgBgMode === 'cycle' && styles.msgBgCycleColors?.length > 0) {
            // Determine effective cycle length based on limit (2 or 3)
            const limit = styles.msgBgCycleCount ?? 3;
            const cycleColors = styles.msgBgCycleColors.slice(0, limit);
            color = cycleColors[index % cycleColors.length];
        } else if (styles.msgBgMode === 'role' && styles.msgBgRoleColors) {
            // Fallback to viewer if no specific badge matches or if badges are empty
            // Logic: Check top role down to viewer
            if (msg.badges?.broadcaster) color = styles.msgBgRoleColors.broadcaster;
            else if (msg.badges?.moderator) color = styles.msgBgRoleColors.moderator;
            else if (msg.badges?.vip) color = styles.msgBgRoleColors.vip;
            else if (msg.badges?.subscriber) color = styles.msgBgRoleColors.subscriber;
            else color = styles.msgBgRoleColors.viewer;
        } else if (styles.msgBgMode === 'pride') {
            const rainbow = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
            color = rainbow[index % rainbow.length];
        }

        return hexToRgba(color, styles.bgOpacity ?? 100);
    };

    // Helper for Text Outline
    const getTextOutlineStyle = () => {
        if (!styles.textOutlineEnabled) return {};
        const c = styles.textOutlineColor || '#000000';
        return {
            textShadow: `
                -1px -1px 0 ${c},  
                 1px -1px 0 ${c},
                -1px  1px 0 ${c},
                 1px  1px 0 ${c}
            `
        };
    };

    const variants = getVariants();
    const textOutlineStyle = getTextOutlineStyle();

    return (
        <div style={getPositionStyles()}>
            <AnimatePresence mode="popLayout">
                {visibleMessages.map((msg, index) => {
                    const accent = styles.useUserColorForAccent
                        ? (msg.color || styles.accentColor)
                        : styles.accentColor;

                    const nameColor = styles.useUserColorForName
                        ? (msg.color || styles.accentColor)
                        : styles.accentColor;

                    // Border Logic
                    const effectiveBorderColor = styles.useUserColorForAccent
                        ? (msg.color || styles.accentColor)
                        : (styles.borderColor || styles.accentColor);

                    const borderStyle = styles.borderEnabled ? `${styles.borderThickness}px solid ${effectiveBorderColor}` : 'none';

                    // Shadow Logic
                    const boxShadowScale = styles.shadowEnabled ?
                        `${styles.shadowOffsetX ?? 0}px ${styles.shadowOffsetY ?? 4}px ${styles.shadowBlur ?? 6}px ${hexToRgba(styles.shadowColor ?? '#000000', styles.shadowOpacity ?? 50)}`
                        : 'none';

                    return (
                        <motion.div
                            key={msg.id}
                            layout
                            initial={variants.initial}
                            animate={variants.animate}
                            exit={variants.exit}
                            transition={{ duration: 0.3 }}
                            className="shadow-sm backdrop-blur-md relative"
                            style={{
                                backgroundColor: getMessageBackground(msg, index),
                                backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderTopLeftRadius: `${styles.borderRadiusTL ?? styles.borderRadius}px`,
                                borderTopRightRadius: `${styles.borderRadiusTR ?? styles.borderRadius}px`,
                                borderBottomLeftRadius: `${styles.borderRadiusBL ?? styles.borderRadius}px`,
                                borderBottomRightRadius: `${styles.borderRadiusBR ?? styles.borderRadius}px`,

                                // Dynamic Borders
                                borderTop: styles.borderEnabled && (styles.borderSides?.top ?? true) ? borderStyle : 'none',
                                borderRight: styles.borderEnabled && (styles.borderSides?.right ?? true) ? borderStyle : 'none',
                                borderBottom: styles.borderEnabled && (styles.borderSides?.bottom ?? true) ? borderStyle : 'none',
                                borderLeft: styles.borderEnabled && (styles.borderSides?.left ?? true) ? borderStyle : 'none',

                                // Box Shadow
                                boxShadow: boxShadowScale,

                                padding: `${styles.padding ?? 12}px`,
                                marginBottom: `${styles.margin ?? 8}px`,
                            }}
                        >

                            {/* Layout Logic Refactor */}
                            {(() => {
                                const TimeComponent = styles.showTimestamp && (
                                    <span
                                        className={`${styles.messageLayout === 'inline' ? 'float-right ml-2' : ''} font-mono`}
                                        style={{
                                            fontSize: `${styles.timestampFontSize ?? 12}px`,
                                            color: styles.timestampColor ?? styles.textColor,
                                            fontWeight: styles.timestampIsBold ? 700 : 400,
                                            opacity: 0.7
                                        }}
                                    >
                                        {formatTime(msg.timestamp)}
                                    </span>
                                );

                                return (
                                    <div className="relative">
                                        {/* Inline Mode: Time floats right, Name is inline */}
                                        {styles.messageLayout === 'inline' && TimeComponent}

                                        <div className={`${styles.messageLayout === 'inline' ? 'inline-flex mr-2' : 'flex justify-between'} items-baseline gap-2 font-bold`}
                                            style={{
                                                fontFamily: styles.fontFamily,
                                                fontSize: `${styles.fontSize * 0.9}px`,
                                                color: nameColor,
                                                ...textOutlineStyle,
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {msg.badges && styles.showBadges && Object.entries(msg.badges).map(([key, value]) => {
                                                    const badgeKey = key as keyof typeof styles.badgeStyles;
                                                    const style = styles.badgeStyles?.[badgeKey];
                                                    if (!style) return null;

                                                    if (style.type === 'dot') {
                                                        return (
                                                            <span
                                                                key={key}
                                                                className="w-2 h-2 rounded-full inline-block"
                                                                style={{ backgroundColor: style.color }}
                                                                title={key}
                                                            />
                                                        );
                                                    } else if (style.type === 'custom' && style.customUrl) {
                                                        return (
                                                            <img
                                                                key={key}
                                                                src={style.customUrl}
                                                                alt={key}
                                                                className="w-4 h-4 object-contain"
                                                            />
                                                        );
                                                    } else if (style.type === 'native') {
                                                        const nativeBadges: Record<string, string> = {
                                                            broadcaster: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1',
                                                            moderator: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1',
                                                            vip: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1',
                                                            staff: 'https://static-cdn.jtvnw.net/badges/v1/d97c37bd-a6f5-4c38-8f57-97339120495f/1',
                                                            admin: 'https://static-cdn.jtvnw.net/badges/v1/9ef7e029-4ece-4d48-96a5-f9d75069b8c8/1',
                                                            premium: 'https://static-cdn.jtvnw.net/badges/v1/a1dd5073-19c3-4911-8cb0-80d4b76c0353/1', // Prime
                                                            turbo: 'https://static-cdn.jtvnw.net/badges/v1/bd444ec6-8f34-4bf9-91f4-af1e3428d80f/1',
                                                            subscriber: 'https://static-cdn.jtvnw.net/badges/v1/5d9f0f98-d8f9-476e-9f60-274291845b74/1', // Generic Star
                                                            partner: 'https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/1',
                                                            artist: 'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fe12bbe4/1',
                                                            founder: 'https://static-cdn.jtvnw.net/badges/v1/51352694-33d2-45cb-a214-497d34190c7b/1',
                                                        };

                                                        let url = nativeBadges[key];

                                                        // Try dynamic badge map first
                                                        if (badgeMap && badgeMap[key] && badgeMap[key][value]) {
                                                            url = badgeMap[key][value];
                                                        }

                                                        // Fallback to subscriber generic if it's a subscriber badge but no specific one found
                                                        if (!url && key === 'subscriber') {
                                                            url = nativeBadges['subscriber'];
                                                        }

                                                        if (!url) return null;

                                                        return (
                                                            <img
                                                                key={key}
                                                                src={url}
                                                                alt={key}
                                                                className="w-4 h-4 object-contain mr-1"
                                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <span key={key} title={key}>
                                                                {key === 'broadcaster' ? '👑' : key === 'moderator' ? '⚔️' : key === 'vip' ? '💎' : '⭐'}
                                                            </span>
                                                        );
                                                    }
                                                })}
                                                <span>
                                                    {msg.user}
                                                    {styles.messageLayout === 'inline' && ":"}
                                                </span>
                                            </div>

                                            {/* Block Mode: Time is in the header, flexed to right */}
                                            {styles.messageLayout === 'block' && TimeComponent}
                                        </div>

                                        <div
                                            className={`break-words leading-snug ${styles.messageLayout === 'inline' ? 'inline' : 'block mt-1'}`}
                                            style={{
                                                fontFamily: styles.fontFamily,
                                                fontSize: `${styles.fontSize}px`,
                                                color: styles.textColor,
                                                fontWeight: styles.isBold ? 700 : 400,
                                                ...textOutlineStyle
                                            }}
                                        >
                                            {renderMessage(msg)}
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
