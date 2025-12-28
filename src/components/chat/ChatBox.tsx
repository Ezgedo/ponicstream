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
    accentColor: string;
    useUserColorForAccent: boolean;
    useUserColorForName: boolean;

    // Shape
    borderRadius: number;

    // Layout
    width: number;
    height: number;
    position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center-left" | "center-right";
    direction: "up" | "down";
    maxMessages: number; // New

    showTimestamp: boolean;

    // Advanced Styling
    padding: number;
    margin: number;
    bgOpacity: number; // 0-100
    borderRadiusTL: number;
    borderRadiusTR: number;
    borderRadiusBL: number;
    borderRadiusBR: number;

    // Badges
    showBadges: boolean;
    badgeStyles: {
        broadcaster: { type: 'dot' | 'icon' | 'custom', color: string, customUrl?: string };
        moderator: { type: 'dot' | 'icon' | 'custom', color: string, customUrl?: string };
        vip: { type: 'dot' | 'icon' | 'custom', color: string, customUrl?: string };
        subscriber: { type: 'dot' | 'icon' | 'custom', color: string, customUrl?: string };
    };

    // Moderation
    ignoredUsers: string[];

    // Behavior
    autoHideSeconds: number; // 0 = never
    animationEntry: "fade" | "slide-up" | "slide-left" | "scale";
    animationExit: "fade" | "slide-down" | "slide-right" | "scale";
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

export default function ChatBox({ styles, messages }: ChatBoxProps) {
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
                filtered = filtered.filter(msg => !styles.ignoredUsers.includes(msg.user.toLowerCase()));
            }

            if (styles.autoHideSeconds === 0) {
                setVisibleMessages(filtered);
                return;
            }

            const now = Date.now();
            const limit = styles.autoHideSeconds * 1000;
            setVisibleMessages(filtered.filter((msg) => (now - msg.timestamp) < limit));
        };

        updateVisibility();
        if (styles.autoHideSeconds > 0) {
            const interval = setInterval(updateVisibility, 1000);
            return () => clearInterval(interval);
        }
    }, [messages, styles.autoHideSeconds, styles.ignoredUsers]);

    // Helper to render message with emotes
    const renderMessage = (msg: ChatMessageData) => {
        if (!msg.emotes) return msg.message;

        // Create an array of text parts and emote parts
        // Twitch emotes format: { "25": ["0-4", "12-16"] } where 25 is emote ID
        const stringReplacements: { start: number; end: number; id: string }[] = [];

        Object.entries(msg.emotes).forEach(([id, positions]) => {
            positions.forEach(pos => {
                const [start, end] = pos.split("-").map(Number);
                stringReplacements.push({ start, end: end + 1, id });
            });
        });

        // Sort by start position
        stringReplacements.sort((a, b) => a.start - b.start);

        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;

        stringReplacements.forEach((replacement, i) => {
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
            padding: "16px",
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

    const variants = getVariants();

    return (
        <div style={getPositionStyles()}>
            <AnimatePresence mode="popLayout">
                {visibleMessages.map((msg) => {
                    const accent = styles.useUserColorForAccent
                        ? (msg.color || styles.accentColor)
                        : styles.accentColor;

                    const nameColor = styles.useUserColorForName
                        ? (msg.color || styles.accentColor)
                        : styles.accentColor;

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
                                backgroundColor: hexToRgba(styles.backgroundColor, styles.bgOpacity ?? 100),
                                borderTopLeftRadius: `${styles.borderRadiusTL ?? styles.borderRadius}px`,
                                borderTopRightRadius: `${styles.borderRadiusTR ?? styles.borderRadius}px`,
                                borderBottomLeftRadius: `${styles.borderRadiusBL ?? styles.borderRadius}px`,
                                borderBottomRightRadius: `${styles.borderRadiusBR ?? styles.borderRadius}px`,
                                borderLeft: `4px solid ${accent}`,
                                padding: `${styles.padding ?? 12}px`,
                                marginBottom: `${styles.margin ?? 8}px`,
                            }}
                        >
                            <div
                                className="flex items-center gap-2 font-bold pr-8"
                                style={{
                                    fontFamily: styles.fontFamily,
                                    fontSize: `${styles.fontSize * 0.9}px`,
                                    color: nameColor,
                                }}
                            >
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
                                    } else {
                                        // Default icons
                                        return (
                                            <span key={key} title={key}>
                                                {key === 'broadcaster' ? '👑' : key === 'moderator' ? '⚔️' : key === 'vip' ? '💎' : '⭐'}
                                            </span>
                                        );
                                    }
                                })}
                                {msg.user}
                            </div>
                            {styles.showTimestamp && (
                                <span
                                    className="absolute top-2 right-2 opacity-50 font-mono"
                                    style={{ fontSize: '0.7em', color: styles.textColor }}
                                >
                                    {formatTime(msg.timestamp)}
                                </span>
                            )}
                            <div
                                className="break-words mt-1 leading-snug"
                                style={{
                                    fontFamily: styles.fontFamily,
                                    fontSize: `${styles.fontSize}px`,
                                    color: styles.textColor,
                                    fontWeight: styles.isBold ? 700 : 400,
                                    textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                                }}
                            >
                                {renderMessage(msg)}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
