"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import ChatBox, { ChatStyles, ChatMessageData } from "@/components/chat/ChatBox";
import ChatPreview from "@/components/chat/ChatPreview";
import { Settings, Copy, Save, ExternalLink, Layout, Palette, Activity, Type, Play, ArrowUp, ArrowDown, LogOut } from "lucide-react";
import Link from "next/link";

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
    bgOpacity: 70, // Percent in UI, converted to 0-1 logic later but interface says 0-100
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

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [styles, setStyles] = useState<ChatStyles>(DEFAULT_STYLES);
    const [isSaved, setIsSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<"layout" | "appearance" | "behavior">("appearance");

    // Preview Messages State
    const [previewMessages, setPreviewMessages] = useState<ChatMessageData[]>([]);

    const [showPreview, setShowPreview] = useState(false);
    const [linkCorners, setLinkCorners] = useState(true);

    const handleSendTestMessage = () => {
        const phrases = [
            "This is a test message!",
            "Hype in the chat! 🔥",
            "Checking those animations...",
            "Another test message.",
            "PogChamp PogChamp",
            "Does the auto-hide work?",
            "Hello world from Dashboard!"
        ];
        const randomMsg = phrases[Math.floor(Math.random() * phrases.length)];
        const newMessage: ChatMessageData = {
            id: Date.now().toString(),
            user: "TestUser_" + Math.floor(Math.random() * 100),
            message: randomMsg,
            color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            timestamp: Date.now(),
            // Mock emote for testing if needed, though random text usually suffices
        };

        setPreviewMessages(prev => {
            const limit = styles.maxMessages || 50;
            const updated = [...prev, newMessage];
            if (updated.length > limit) {
                return updated.slice(updated.length - limit);
            }
            return updated;
        });
    };

    useEffect(() => {
        const saved = localStorage.getItem("chatStyles");
        if (saved) {
            try {
                // Merge saved styles with default in case of new fields
                setStyles((prev) => ({ ...DEFAULT_STYLES, ...JSON.parse(saved) }));
            } catch (e) {
                console.error("Failed to parse saved styles", e);
            }
        }
    }, []);

    useEffect(() => {
        if (session?.user?.name) {
            localStorage.setItem("twitchChannel", session.user.name);
        }
    }, [session]);

    // Enforce maxMessages on existing buffer when setting changes
    useEffect(() => {
        const limit = styles.maxMessages || 50;
        if (previewMessages.length > limit) {
            setPreviewMessages(prev => prev.slice(prev.length - limit));
        }
    }, [styles.maxMessages, previewMessages.length]);

    const handleSave = () => {
        localStorage.setItem("chatStyles", JSON.stringify(styles));
        if (session?.user?.name) {
            localStorage.setItem("twitchChannel", session.user.name);
        }
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleCopyUrl = () => {
        const params = new URLSearchParams();
        (Object.keys(styles) as Array<keyof ChatStyles>).forEach(key => {
            if (typeof styles[key] !== 'object') {
                params.append(key, String(styles[key]));
            }
        });
        if (session?.user?.name) {
            params.append("channel", session.user.name);
        }

        const url = `${window.location.origin}/overlay/chat?${params.toString()}`;
        navigator.clipboard.writeText(url);
        alert("Overlay URL copied. Note: Complex settings rely on LocalStorage usage or clicking 'Save' first.");
    };

    if (status === "loading") return <div className="text-white p-10">Loading...</div>;

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6 p-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    Streamer Tools
                </h1>
                <button onClick={() => signIn("twitch")} className="bg-[#6441a5] px-6 py-3 rounded-full font-bold">
                    Login with Twitch
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="text-purple-500" /> Chat Configuration
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 justify-center">
                    <button onClick={handleCopyUrl} className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10 flex items-center gap-1 transition-colors">
                        <Copy size={12} /> Copy URL
                    </button>
                    <Link href="/overlay/chat" target="_blank" className="px-3 py-1.5 text-xs bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 rounded border border-purple-500/30 flex items-center gap-1 transition-colors">
                        <ExternalLink size={12} /> Open Overlay
                    </Link>
                    <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-2 ${showPreview ? "bg-purple-900/30 border-purple-500/50 text-purple-300" : "bg-neutral-800 border-white/10 text-gray-400"}`}
                    >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>
                    <div className="flex items-center gap-3 border-l border-white/10 pl-3 ml-1">
                        <div className="flex items-center gap-2">
                            <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-purple-500" />
                            <span className="hidden sm:inline text-sm font-medium">{session.user?.name}</span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SETTINGS PANEL */}
                <div className={`${showPreview ? "lg:col-span-1" : "lg:col-span-3 max-w-2xl mx-auto w-full"} bg-neutral-900 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[80vh] transition-all duration-300`}>
                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        <button onClick={() => setActiveTab("appearance")} className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 ${activeTab === "appearance" ? "bg-white/5 text-purple-400" : "text-gray-400 hover:bg-white/5"}`}>
                            <Palette size={16} /> Style
                        </button>
                        <button onClick={() => setActiveTab("layout")} className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 ${activeTab === "layout" ? "bg-white/5 text-purple-400" : "text-gray-400 hover:bg-white/5"}`}>
                            <Layout size={16} /> Layout
                        </button>
                        <button onClick={() => setActiveTab("behavior")} className={`flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 ${activeTab === "behavior" ? "bg-white/5 text-purple-400" : "text-gray-400 hover:bg-white/5"}`}>
                            <Activity size={16} /> Behavior
                        </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        {/* APPEARANCE TAB */}
                        {activeTab === "appearance" && (
                            <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Typography</h3>

                                    {/* Font Family */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Font Family</label>
                                        <select value={styles.fontFamily} onChange={(e) => setStyles({ ...styles, fontFamily: e.target.value })} className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10">
                                            <option value="Inter, sans-serif">Inter</option>
                                            <option value="'Courier New', monospace">Courier New</option>
                                            <option value="'Times New Roman', serif">Times New Roman</option>
                                            <option value="'Arial', sans-serif">Arial</option>
                                            <option value="'Brush Script MT', cursive">Brush Script</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-4">
                                        {/* Font Size */}
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs text-gray-400">Size ({styles.fontSize}px)</label>
                                            <input type="range" min="10" max="40" value={styles.fontSize} onChange={(e) => setStyles({ ...styles, fontSize: Number(e.target.value) })} className="w-full accent-purple-500" />
                                        </div>
                                        {/* Font Weight */}
                                        <div className="space-y-1 flex items-center pt-4">
                                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input type="checkbox" checked={styles.isBold} onChange={(e) => setStyles({ ...styles, isBold: e.target.checked })} className="accent-purple-500 w-4 h-4" />
                                                Bold Text
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colors</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Text Color</label>
                                            <input type="color" value={styles.textColor} onChange={(e) => setStyles({ ...styles, textColor: e.target.value })} className="w-full h-8 rounded bg-transparent cursor-pointer" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Background</label>
                                            <input type="color" value={styles.backgroundColor.startsWith("#") ? styles.backgroundColor : "#000000"} onChange={(e) => setStyles({ ...styles, backgroundColor: e.target.value })} className="w-full h-8 rounded bg-transparent cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Background Opacity ({styles.bgOpacity ?? 70}%)</label>
                                        <input type="range" min="0" max="100" value={styles.bgOpacity ?? 70} onChange={(e) => setStyles({ ...styles, bgOpacity: Number(e.target.value) })} className="w-full accent-purple-500" />
                                    </div>

                                    <div className="p-3 bg-neutral-800 rounded-lg space-y-3 border border-white/5">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Accent Color</label>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={styles.accentColor} onChange={(e) => setStyles({ ...styles, accentColor: e.target.value })} className="h-8 w-12 rounded bg-transparent cursor-pointer" />
                                                <span className="text-xs text-gray-500">{styles.accentColor}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={styles.useUserColorForAccent} onChange={(e) => setStyles({ ...styles, useUserColorForAccent: e.target.checked })} className="accent-purple-500" />
                                                Use Twitch User Color for Border
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={styles.useUserColorForName} onChange={(e) => setStyles({ ...styles, useUserColorForName: e.target.checked })} className="accent-purple-500" />
                                                Use Twitch User Color for Name
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spacing & shape</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Padding ({styles.padding ?? 12}px)</label>
                                            <input type="range" min="0" max="40" value={styles.padding ?? 12} onChange={(e) => setStyles({ ...styles, padding: Number(e.target.value) })} className="w-full accent-purple-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Margin ({styles.margin ?? 8}px)</label>
                                            <input type="range" min="0" max="40" value={styles.margin ?? 8} onChange={(e) => setStyles({ ...styles, margin: Number(e.target.value) })} className="w-full accent-purple-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs text-gray-400">Border Radius (Corners)</label>
                                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={linkCorners} onChange={(e) => setLinkCorners(e.target.checked)} className="accent-purple-500" />
                                                Link All Corners
                                            </label>
                                        </div>

                                        {linkCorners ? (
                                            <div className="space-y-1">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="40"
                                                    value={styles.borderRadius}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setStyles({
                                                            ...styles,
                                                            borderRadius: val,
                                                            borderRadiusTL: val,
                                                            borderRadiusTR: val,
                                                            borderRadiusBL: val,
                                                            borderRadiusBR: val
                                                        });
                                                    }}
                                                    className="w-full accent-purple-500"
                                                />
                                                <div className="text-right text-[10px] text-gray-500">{styles.borderRadius}px</div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-gray-500 flex justify-between">Top Left <span>{styles.borderRadiusTL ?? styles.borderRadius}px</span></label>
                                                    <input type="range" min="0" max="40" value={styles.borderRadiusTL ?? styles.borderRadius} onChange={(e) => setStyles({ ...styles, borderRadiusTL: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-gray-500 flex justify-between">Top Right <span>{styles.borderRadiusTR ?? styles.borderRadius}px</span></label>
                                                    <input type="range" min="0" max="40" value={styles.borderRadiusTR ?? styles.borderRadius} onChange={(e) => setStyles({ ...styles, borderRadiusTR: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-gray-500 flex justify-between">Bottom Left <span>{styles.borderRadiusBL ?? styles.borderRadius}px</span></label>
                                                    <input type="range" min="0" max="40" value={styles.borderRadiusBL ?? styles.borderRadius} onChange={(e) => setStyles({ ...styles, borderRadiusBL: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-gray-500 flex justify-between">Bottom Right <span>{styles.borderRadiusBR ?? styles.borderRadius}px</span></label>
                                                    <input type="range" min="0" max="40" value={styles.borderRadiusBR ?? styles.borderRadius} onChange={(e) => setStyles({ ...styles, borderRadiusBR: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">User Badges</h3>
                                        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={styles.showBadges ?? true} onChange={(e) => setStyles({ ...styles, showBadges: e.target.checked })} className="accent-purple-500" />
                                            Enable
                                        </label>
                                    </div>

                                    {styles.showBadges && (
                                        <div className="space-y-2 bg-neutral-800 p-3 rounded-lg border border-white/5">
                                            {Object.entries(styles.badgeStyles || {}).map(([role, conf]) => (
                                                <div key={role} className="flex flex-col gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs capitalize w-20 text-gray-400">{role}</span>
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={conf.type}
                                                                onChange={(e) => setStyles({
                                                                    ...styles,
                                                                    badgeStyles: {
                                                                        ...styles.badgeStyles,
                                                                        [role]: { ...conf, type: e.target.value as any }
                                                                    }
                                                                })}
                                                                className="bg-neutral-900 border border-white/10 text-xs rounded p-1 text-gray-300 focus:border-purple-500 outline-none"
                                                            >
                                                                <option value="icon">Default Icon</option>
                                                                <option value="dot">Dot</option>
                                                                <option value="custom">Custom Icon</option>
                                                            </select>

                                                            {conf.type === 'dot' && (
                                                                <input
                                                                    type="color"
                                                                    value={conf.color}
                                                                    onChange={(e) => setStyles({
                                                                        ...styles,
                                                                        badgeStyles: {
                                                                            ...styles.badgeStyles,
                                                                            [role]: { ...conf, color: e.target.value }
                                                                        }
                                                                    })}
                                                                    className="w-6 h-6 rounded bg-transparent cursor-pointer border-none"
                                                                    title="Dot Color"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {conf.type === 'custom' && (
                                                        <input
                                                            type="text"
                                                            placeholder="Image URL (https://...)"
                                                            value={conf.customUrl || ''}
                                                            onChange={(e) => setStyles({
                                                                ...styles,
                                                                badgeStyles: {
                                                                    ...styles.badgeStyles,
                                                                    [role]: { ...conf, customUrl: e.target.value }
                                                                }
                                                            })}
                                                            className="w-full bg-neutral-900 border border-white/10 rounded p-1.5 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-purple-500 outline-none"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}

                        {/* LAYOUT TAB */}
                        {activeTab === "layout" && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">Flow Direction</h3>
                                    <div className="flex bg-neutral-800 p-1 rounded-lg border border-white/5">
                                        <button
                                            onClick={() => setStyles({ ...styles, direction: 'down' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm transition-all ${styles.direction === 'down' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-neutral-700'}`}
                                        >
                                            <ArrowDown size={14} /> Normal (Down)
                                        </button>
                                        <button
                                            onClick={() => setStyles({ ...styles, direction: 'up' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm transition-all ${styles.direction === 'up' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-neutral-700'}`}
                                        >
                                            <ArrowUp size={14} /> Reversed (Up)
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        <strong>Normal:</strong> New messages appear at the bottom.<br />
                                        <strong>Reversed:</strong> New messages appear at the top.
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dimensions</h3>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Width ({styles.width}px)</label>
                                        <input type="range" min="200" max="800" step="10" value={styles.width} onChange={(e) => setStyles({ ...styles, width: Number(e.target.value) })} className="w-full accent-purple-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Height ({styles.height}px)</label>
                                        <input type="range" min="200" max="1000" step="10" value={styles.height} onChange={(e) => setStyles({ ...styles, height: Number(e.target.value) })} className="w-full accent-purple-500" />
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Screen Position</h3>
                                    <div className="grid grid-cols-3 gap-2 bg-neutral-800 p-2 rounded-lg border border-white/5">
                                        {["top-left", "top-center", "top-right", "center-left", "", "center-right", "bottom-left", "bottom-center", "bottom-right"].map((pos, i) => (
                                            pos ? (
                                                <button
                                                    key={pos}
                                                    onClick={() => setStyles({ ...styles, position: pos as any })}
                                                    className={`aspect-square rounded border transition-all ${styles.position === pos ? "bg-purple-600 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-neutral-700 border-neutral-600 hover:bg-neutral-600"}`}
                                                    title={pos}
                                                />
                                            ) : <div key={i} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-center text-gray-500">Click a square to anchor the chat box.</p>
                                </section>
                            </div>
                        )}

                        {/* BEHAVIOR TAB */}
                        {activeTab === "behavior" && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visibility & Testing</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Auto-hide Messages (Seconds)</label>
                                            <div className="flex items-center gap-4">
                                                <input type="range" min="0" max="60" value={styles.autoHideSeconds} onChange={(e) => setStyles({ ...styles, autoHideSeconds: Number(e.target.value) })} className="flex-1 accent-purple-500" />
                                                <span className="text-sm font-mono w-12 text-right">{styles.autoHideSeconds > 0 ? `${styles.autoHideSeconds}s` : "Never"}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-400">Max Messages ({styles.maxMessages || 50})</label>
                                            <input type="range" min="5" max="100" step="5" value={styles.maxMessages || 50} onChange={(e) => setStyles({ ...styles, maxMessages: Number(e.target.value) })} className="w-full accent-purple-500" />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={styles.showTimestamp ?? false} onChange={(e) => setStyles({ ...styles, showTimestamp: e.target.checked })} className="accent-purple-500 w-4 h-4" />
                                                Show Timestamp (HH:MM)
                                            </label>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Moderation</h3>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400">Ignored Users (one per line)</label>
                                        <textarea
                                            value={styles.ignoredUsers?.join('\n') || ''}
                                            onChange={(e) => setStyles({ ...styles, ignoredUsers: e.target.value.split('\n').map(s => s.trim()).filter(s => s) })}
                                            className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10 h-24"
                                            placeholder="StreamElements&#10;Nightbot"
                                        />
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Animations</h3>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">Entry Effect</label>
                                        <select value={styles.animationEntry} onChange={(e) => setStyles({ ...styles, animationEntry: e.target.value as any })} className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10">
                                            <option value="fade">Fade In</option>
                                            <option value="slide-up">Slide Up</option>
                                            <option value="slide-left">Slide Left</option>
                                            <option value="scale">Scale Up</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">Exit Effect</label>
                                        <select value={styles.animationExit} onChange={(e) => setStyles({ ...styles, animationExit: e.target.value as any })} className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10">
                                            <option value="fade">Fade Out</option>
                                            <option value="slide-down">Slide Down</option>
                                            <option value="slide-right">Slide Right</option>
                                            <option value="scale">Scale Down</option>
                                        </select>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 space-y-3">

                        <button onClick={handleSave} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-all flex justify-center items-center gap-2 shadow-lg shadow-purple-900/20">
                            <Save size={18} /> {isSaved ? "Configuration Saved!" : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* PREVIEW PANEL */}
                {showPreview && (
                    <div className="lg:col-span-2 bg-neutral-900 rounded-xl border border-white/5 flex flex-col p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><Activity size={18} className="text-purple-400" /> Live Preview</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSendTestMessage}
                                    className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10 flex items-center gap-2 transition-colors text-purple-300"
                                >
                                    <Play size={12} /> Send Test Message
                                </button>
                            </div>
                        </div>

                        {/* The preview container represents the viewport (screen) */}
                        <div className="flex-1 rounded-lg bg-[url('https://files.catbox.moe/3b5u4d.jpg')] bg-cover bg-center relative overflow-hidden shadow-2xl min-h-[500px] border border-white/10">
                            <div className="absolute inset-0 bg-black/40"></div>
                            <ChatPreview styles={styles} messages={previewMessages} />
                        </div>
                        <p className="text-xs text-center text-gray-600 mt-2">Background image is for preview purposes only.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
