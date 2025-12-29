"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import ChatBox, { ChatStyles, ChatMessageData } from "@/components/chat/ChatBox";
import ChatPreview from "@/components/chat/ChatPreview";
import { Settings, Copy, Save, ExternalLink, Layout, Palette, Activity, Type, Play, ArrowUp, ArrowDown, LogOut, Download, Upload, Clipboard, ClipboardCopy, ChevronDown, FileJson, CheckCircle, AlertCircle, X, ArrowRight } from "lucide-react";
import Link from "next/link";

const DEFAULT_STYLES: ChatStyles = {
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
    isBold: false,
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
    bgOpacity: 70, // Percent in UI, converted to 0-1 logic later but interface says 0-100
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

    // Borders
    borderEnabled: true,
    borderThickness: 4,
    borderColor: "", // Default to accent if empty
    borderSides: { top: false, right: false, bottom: false, left: true },

    // Shadows
    shadowEnabled: false,
    shadowColor: "#000000",
    shadowOpacity: 50,
    shadowBlur: 6,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
};

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [styles, setStyles] = useState<ChatStyles>(DEFAULT_STYLES);
    const [lastSavedStyles, setLastSavedStyles] = useState<string>(JSON.stringify(DEFAULT_STYLES)); // Store as string for easy comparison
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [ignoredUsersRaw, setIgnoredUsersRaw] = useState(DEFAULT_STYLES.ignoredUsers.join(', '));
    const [isSaved, setIsSaved] = useState(false);
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([]);
    const [activeTab, setActiveTab] = useState<"layout" | "appearance" | "behavior">("appearance");

    // Toast Helper
    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Dirty Check Effect
    useEffect(() => {
        const currentString = JSON.stringify(styles);
        setHasUnsavedChanges(currentString !== lastSavedStyles);
    }, [styles, lastSavedStyles]);

    // Accordion State
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        typography: false,
        colors: false,
        timestamp: false,
        spacing: false,
        badges: false,
        moderation: false,
        animations: false,
        visibility: false,
        dimensions: false,
        screenPos: false,
        flow: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Preview Messages State
    const [previewMessages, setPreviewMessages] = useState<ChatMessageData[]>([]);

    const [showPreview, setShowPreview] = useState(false);
    const [linkCorners, setLinkCorners] = useState(true);
    const [showConfigDropdown, setShowConfigDropdown] = useState(false);
    const configDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (configDropdownRef.current && !configDropdownRef.current.contains(event.target as Node)) {
                setShowConfigDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


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
                const parsed = JSON.parse(saved);
                setStyles((prev) => ({
                    ...prev,
                    ...parsed,
                    // Ensure deep merge for nested objects like msgBgRoleColors
                    msgBgRoleColors: { ...DEFAULT_STYLES.msgBgRoleColors, ...(parsed.msgBgRoleColors || {}) },
                    badgeStyles: { ...DEFAULT_STYLES.badgeStyles, ...(parsed.badgeStyles || {}) },
                }));
                // Sync raw input state
                if (parsed.ignoredUsers) {
                    setIgnoredUsersRaw(parsed.ignoredUsers.join(', '));
                }

                // Set initial save state since we just loaded from storage
                if (parsed) {
                    setLastSavedStyles(JSON.stringify({ ...DEFAULT_STYLES, ...parsed }));
                }

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
        const stylesString = JSON.stringify(styles);
        localStorage.setItem("chatStyles", stylesString);
        if (session?.user?.name) {
            localStorage.setItem("twitchChannel", session.user.name);
        }
        setLastSavedStyles(stylesString);
        setIsSaved(true);
        addToast("Changes saved successfully!", "success");
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(styles, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "chat-config.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addToast("Configuration exported!", "success");
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files[0]) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                try {
                    if (e.target?.result) {
                        applyConfig(e.target.result as string);
                    }
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    addToast("Invalid JSON file.", "error");
                }
            };
        }
    };

    // Helper for validation in applyConfig
    const applyConfig = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);

            // Validation
            if (!parsed.fontFamily || !parsed.textColor || !parsed.msgBgMode) {
                addToast("Invalid configuration. Missing required fields.", "error");
                return;
            }

            setStyles(prev => ({
                ...prev,
                ...parsed,
                msgBgRoleColors: { ...DEFAULT_STYLES.msgBgRoleColors, ...(parsed.msgBgRoleColors || {}) },
                badgeStyles: { ...DEFAULT_STYLES.badgeStyles, ...(parsed.badgeStyles || {}) },
            }));
            if (parsed.ignoredUsers) {
                setIgnoredUsersRaw(parsed.ignoredUsers.join(', '));
            }
            addToast("Configuration loaded successfully!", "success");
        } catch (error) {
            addToast("Failed to parse config.", "error");
        }
    }

    const handleCopyUrl = () => {
        const url = new URL(`${window.location.origin}/overlay/chat`);
        if (session?.user?.name) {
            url.searchParams.append("channel", session.user.name);
        }

        navigator.clipboard.writeText(url.toString());
        addToast("Overlay URL copied to clipboard!", "success");
    };

    const handleCopyJson = () => {
        const dataStr = JSON.stringify(styles, null, 2);
        navigator.clipboard.writeText(dataStr);
        addToast("Configuration copied to clipboard!", "success");
    };

    const handlePasteJson = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                applyConfig(text);
            }
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            addToast("Could not read clipboard. Please allow access.", "error");
        }
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
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Back to Hub">
                        <ArrowRight className="rotate-180" size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="text-purple-500" /> Chat Configuration
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 justify-center relative">
                    {/* Config Dropdown */}
                    <div className="relative" ref={configDropdownRef}>
                        <button
                            onClick={() => setShowConfigDropdown(!showConfigDropdown)}
                            className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 rounded border border-white/10 flex items-center gap-2 transition-colors"
                        >
                            <FileJson size={14} className="text-purple-400" /> Manage Config <ChevronDown size={12} />
                        </button>

                        {showConfigDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-1 space-y-1">
                                    <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-1">Export / Copy</div>
                                    <button onClick={() => { handleExportJson(); setShowConfigDropdown(false); }} className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 rounded flex items-center gap-2 text-gray-300">
                                        <Download size={12} /> Export File (.json)
                                    </button>
                                    <button onClick={() => { handleCopyJson(); setShowConfigDropdown(false); }} className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 rounded flex items-center gap-2 text-gray-300">
                                        <ClipboardCopy size={12} /> Copy to Clipboard
                                    </button>

                                    <div className="h-px bg-white/5 my-1"></div>

                                    <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-1">Import / Paste</div>
                                    <label className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 rounded flex items-center gap-2 text-gray-300 cursor-pointer">
                                        <Upload size={12} /> Import File (.json)
                                        <input type="file" accept=".json" onChange={(e) => { handleImportJson(e); setShowConfigDropdown(false); }} className="hidden" />
                                    </label>
                                    <button onClick={() => { handlePasteJson(); setShowConfigDropdown(false); }} className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5 rounded flex items-center gap-2 text-gray-300">
                                        <Clipboard size={12} /> Paste from Clipboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* URL Group */}
                    <div className="flex bg-neutral-800 rounded border border-white/10 overflow-hidden">
                        <button onClick={handleCopyUrl} className="px-3 py-1.5 text-xs hover:bg-neutral-700 flex items-center gap-1 transition-colors border-r border-white/5">
                            <Copy size={12} /> Copy URL
                        </button>
                        <Link href="/overlay/chat" target="_blank" className="px-3 py-1.5 text-xs hover:bg-neutral-700 flex items-center gap-1 transition-colors text-purple-400 hover:text-purple-300">
                            <ExternalLink size={12} /> Open
                        </Link>
                    </div>

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

                    <div className="p-6 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                        {/* APPEARANCE TAB */}
                        {activeTab === "appearance" && (
                            <div className="space-y-2 animate-in slide-in-from-left-4 fade-in duration-300">
                                {/* Typography Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('typography')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Typography
                                        {openSections.typography ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.typography && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
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

                                            {/* Text Outline */}
                                            <div className="pt-2 border-t border-white/5 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={styles.textOutlineEnabled ?? false}
                                                            onChange={(e) => setStyles({ ...styles, textOutlineEnabled: e.target.checked })}
                                                            className="accent-purple-500"
                                                        />
                                                        Text Outline (Stroke)
                                                    </label>
                                                    {styles.textOutlineEnabled && (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="color"
                                                                value={styles.textOutlineColor ?? "#000000"}
                                                                onChange={(e) => setStyles({ ...styles, textOutlineColor: e.target.value })}
                                                                className="h-6 w-8 rounded bg-transparent cursor-pointer"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Colors Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('colors')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Message Theme
                                        {openSections.colors ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.colors && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Text Color</label>
                                                    <input type="color" value={styles.textColor} onChange={(e) => setStyles({ ...styles, textColor: e.target.value })} className="w-full h-8 rounded bg-transparent cursor-pointer" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Nickname Color</label>
                                                    <div className="flex items-center gap-2">
                                                        <input type="color" value={styles.accentColor} onChange={(e) => setStyles({ ...styles, accentColor: e.target.value })} className="h-8 w-full rounded bg-transparent cursor-pointer" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 p-2 bg-neutral-800 rounded border border-white/5">
                                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                    <input type="checkbox" checked={styles.useUserColorForName} onChange={(e) => setStyles({ ...styles, useUserColorForName: e.target.checked })} className="accent-purple-500" />
                                                    Use Twitch User Color for Name
                                                </label>
                                            </div>

                                            {/* Background Mode Selector */}
                                            <div className="space-y-2 pt-2 border-t border-white/5">
                                                <label className="text-xs text-gray-400 block">Message Background Mode</label>
                                                <select
                                                    value={styles.msgBgMode || 'solid'}
                                                    onChange={(e) => setStyles({ ...styles, msgBgMode: e.target.value as any })}
                                                    className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10"
                                                >
                                                    <option value="solid">Solid Color</option>
                                                    <option value="transparent">Transparent (None)</option>
                                                    <option value="image">Image (URL)</option>
                                                    <option value="cycle">Cycle (Multi-Color)</option>
                                                    <option value="role">Role Based</option>
                                                    <option value="pride">Pride (Rainbow)</option>
                                                </select>

                                                {/* Solid Mode Config */}
                                                {styles.msgBgMode === 'solid' && (
                                                    <div className="space-y-1 mt-2">
                                                        <label className="text-xs text-gray-400">Background Color</label>
                                                        <input
                                                            type="color"
                                                            value={styles.backgroundColor.startsWith("#") ? styles.backgroundColor : "#000000"}
                                                            onChange={(e) => setStyles({ ...styles, backgroundColor: e.target.value })}
                                                            className="w-full h-8 rounded bg-transparent cursor-pointer"
                                                        />
                                                    </div>
                                                )}

                                                {/* Image Mode Config */}
                                                {styles.msgBgMode === 'image' && (
                                                    <div className="space-y-1 mt-2">
                                                        <label className="text-xs text-gray-400">Image URL</label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://..."
                                                            value={styles.backgroundImage || ''}
                                                            onChange={(e) => setStyles({ ...styles, backgroundImage: e.target.value })}
                                                            className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10 placeholder:text-gray-600 focus:border-purple-500 outline-none"
                                                        />
                                                    </div>
                                                )}

                                                {/* Cycle Mode Config */}
                                                {styles.msgBgMode === 'cycle' && (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="flex bg-neutral-800 p-1 rounded border border-white/5">
                                                            <button
                                                                onClick={() => setStyles({ ...styles, msgBgCycleCount: 2 })}
                                                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${styles.msgBgCycleCount === 2 ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                            >
                                                                2 Colors
                                                            </button>
                                                            <button
                                                                onClick={() => setStyles({ ...styles, msgBgCycleCount: 3 })}
                                                                className={`flex-1 text-[10px] py-1 rounded transition-colors ${(styles.msgBgCycleCount ?? 3) === 3 ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                                            >
                                                                3 Colors
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[0, 1, 2].map((i) => {
                                                                const limit = styles.msgBgCycleCount ?? 3;
                                                                if (i >= limit) return null;
                                                                return (
                                                                    <div key={i} className="space-y-1">
                                                                        <label className="text-[10px] text-gray-500">Color {i + 1}</label>
                                                                        <input
                                                                            type="color"
                                                                            value={styles.msgBgCycleColors?.[i] || '#ffffff'}
                                                                            onChange={(e) => {
                                                                                const newColors = [...(styles.msgBgCycleColors || [])];
                                                                                newColors[i] = e.target.value;
                                                                                setStyles({ ...styles, msgBgCycleColors: newColors });
                                                                            }}
                                                                            className="w-full h-8 rounded bg-transparent cursor-pointer"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Role Color Config */}
                                                {styles.msgBgMode === 'role' && (
                                                    <div className="space-y-2 mt-2">
                                                        {Object.entries(styles.msgBgRoleColors || DEFAULT_STYLES.msgBgRoleColors || {}).map(([role, color]) => (
                                                            <div key={role} className="flex justify-between items-center text-xs">
                                                                <span className="capitalize text-gray-400">{role}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="color"
                                                                        value={color}
                                                                        onChange={(e) => {
                                                                            setStyles({
                                                                                ...styles,
                                                                                msgBgRoleColors: { ...(styles.msgBgRoleColors || DEFAULT_STYLES.msgBgRoleColors), [role]: e.target.value }
                                                                            });
                                                                        }}
                                                                        className="h-6 w-8 rounded bg-transparent cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {styles.msgBgMode === 'pride' && (
                                                    <p className="text-[10px] text-purple-400 mt-1 italic">
                                                        Rainbow colors will cycle through messages automatically! 🌈
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-1 pt-2 border-t border-white/5">
                                                <label className="text-xs text-gray-400">Background Opacity ({styles.bgOpacity ?? 70}%)</label>
                                                <input type="range" min="0" max="100" value={styles.bgOpacity ?? 70} onChange={(e) => setStyles({ ...styles, bgOpacity: Number(e.target.value) })} className="w-full accent-purple-500" />
                                            </div>

                                            {/* Borders Section */}
                                            <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 mt-2">
                                                <div className="p-4 border-t border-white/5 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Border</label>
                                                        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                            <input type="checkbox" checked={styles.borderEnabled ?? true} onChange={(e) => setStyles({ ...styles, borderEnabled: e.target.checked })} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                                                            Enable
                                                        </label>
                                                    </div>

                                                    {styles.borderEnabled && (
                                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="flex gap-4">
                                                                <div className="space-y-1 flex-1">
                                                                    <label className="text-xs text-gray-400">Thickness ({styles.borderThickness ?? 4}px)</label>
                                                                    <input type="range" min="1" max="10" value={styles.borderThickness ?? 4} onChange={(e) => setStyles({ ...styles, borderThickness: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                                </div>
                                                                <div className="space-y-1 flex flex-col justify-end">
                                                                    {!styles.useUserColorForAccent && (
                                                                        <>
                                                                            <label className="text-xs text-gray-400">Color</label>
                                                                            <div className="flex items-center gap-2">
                                                                                <input type="color" value={styles.borderColor || styles.accentColor} onChange={(e) => setStyles({ ...styles, borderColor: e.target.value })} className="h-8 w-12 rounded bg-transparent cursor-pointer" />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-2 p-2 bg-neutral-800 rounded border border-white/5">
                                                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                                    <input type="checkbox" checked={styles.useUserColorForAccent} onChange={(e) => setStyles({ ...styles, useUserColorForAccent: e.target.checked })} className="accent-purple-500" />
                                                                    Use Twitch User Color
                                                                </label>
                                                            </div>

                                                            <div className="space-y-1 pt-2 border-t border-white/5">
                                                                <label className="text-[10px] text-gray-500 uppercase font-bold">Sides</label>
                                                                <div className="flex bg-neutral-800 rounded p-1">
                                                                    {['top', 'right', 'bottom', 'left'].map((side) => (
                                                                        <button
                                                                            key={side}
                                                                            onClick={() => setStyles({
                                                                                ...styles,
                                                                                borderSides: {
                                                                                    ...(styles.borderSides || { top: false, right: false, bottom: false, left: true }),
                                                                                    [side]: !(styles.borderSides as any)?.[side]
                                                                                }
                                                                            })}
                                                                            className={`flex-1 py-1 text-[10px] capitalize rounded transition-colors ${(styles.borderSides as any)?.[side] ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                                                        >
                                                                            {side}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Shadows Section */}
                                            <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 mt-2">
                                                <div className="p-4 border-t border-white/5 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Box Shadow</label>
                                                        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                            <input type="checkbox" checked={styles.shadowEnabled ?? false} onChange={(e) => setStyles({ ...styles, shadowEnabled: e.target.checked })} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                                                            Enable
                                                        </label>
                                                    </div>

                                                    {styles.shadowEnabled && (
                                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-gray-400">Blur ({styles.shadowBlur ?? 6}px)</label>
                                                                    <input type="range" min="0" max="20" value={styles.shadowBlur ?? 6} onChange={(e) => setStyles({ ...styles, shadowBlur: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-gray-400">Opacity ({styles.shadowOpacity ?? 50}%)</label>
                                                                    <input type="range" min="0" max="100" value={styles.shadowOpacity ?? 50} onChange={(e) => setStyles({ ...styles, shadowOpacity: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-gray-400">Offset X ({styles.shadowOffsetX ?? 0}px)</label>
                                                                    <input type="range" min="-20" max="20" value={styles.shadowOffsetX ?? 0} onChange={(e) => setStyles({ ...styles, shadowOffsetX: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-gray-400">Offset Y ({styles.shadowOffsetY ?? 4}px)</label>
                                                                    <input type="range" min="-20" max="20" value={styles.shadowOffsetY ?? 4} onChange={(e) => setStyles({ ...styles, shadowOffsetY: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-xs text-gray-400">Shadow Color</label>
                                                                <input type="color" value={styles.shadowColor || "#000000"} onChange={(e) => setStyles({ ...styles, shadowColor: e.target.value })} className="w-full h-8 rounded bg-transparent cursor-pointer" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Timestamp Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('timestamp')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Timestamp
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={styles.showTimestamp ?? false}
                                                onChange={(e) => { e.stopPropagation(); setStyles({ ...styles, showTimestamp: e.target.checked }); }}
                                                className="accent-purple-500 w-4 h-4 cursor-pointer"
                                            />
                                            {openSections.timestamp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </div>
                                    </button>

                                    {openSections.timestamp && styles.showTimestamp && (
                                        <div className="p-4 border-t border-white/5 space-y-2 bg-neutral-800/50">
                                            <div className="flex gap-4">
                                                <div className="space-y-1 flex-1">
                                                    <label className="text-xs text-gray-400">Size ({styles.timestampFontSize ?? 12}px)</label>
                                                    <input type="range" min="8" max="24" value={styles.timestampFontSize ?? 12} onChange={(e) => setStyles({ ...styles, timestampFontSize: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Color</label>
                                                    <div className="flex items-center gap-2">
                                                        <input type="color" value={styles.timestampColor ?? "#999999"} onChange={(e) => setStyles({ ...styles, timestampColor: e.target.value })} className="h-8 w-12 rounded bg-transparent cursor-pointer" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                                    <input type="checkbox" checked={styles.timestampIsBold ?? false} onChange={(e) => setStyles({ ...styles, timestampIsBold: e.target.checked })} className="accent-purple-500" />
                                                    Bold Timestamp
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Spacing & Shape Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('spacing')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Spacing & Shape
                                        {openSections.spacing ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.spacing && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Message Padding ({styles.padding ?? 12}px)</label>
                                                    <input type="range" min="0" max="40" value={styles.padding ?? 12} onChange={(e) => setStyles({ ...styles, padding: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs text-gray-400">Border Radius ({linkCorners ? `${styles.borderRadius}px` : "Custom"})</label>
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
                                        </div>
                                    )}

                                </div>

                                {/* User Badges Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('badges')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        User Badges
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={styles.showBadges ?? true}
                                                onChange={(e) => { e.stopPropagation(); setStyles({ ...styles, showBadges: e.target.checked }); }}
                                                className="accent-purple-500 w-4 h-4 cursor-pointer"
                                            />
                                            {openSections.badges ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </div>
                                    </button>

                                    {openSections.badges && styles.showBadges && (
                                        <div className="p-4 border-t border-white/5 space-y-2 bg-neutral-800/50">
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
                                </div>
                            </div>
                        )}

                        {/* LAYOUT TAB */}
                        {activeTab === "layout" && (
                            <div className="space-y-2 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Flow Direction Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('flow')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Flow Direction
                                        {openSections.flow ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.flow && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
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
                                        </div>
                                    )}
                                </div>

                                {/* Dimensions Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('dimensions')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Dimensions
                                        {openSections.dimensions ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.dimensions && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Width ({styles.width}px)</label>
                                                <input type="range" min="200" max="800" step="10" value={styles.width} onChange={(e) => setStyles({ ...styles, width: Number(e.target.value) })} className="w-full accent-purple-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Height ({styles.height}px)</label>
                                                <input type="range" min="200" max="1000" step="10" value={styles.height} onChange={(e) => setStyles({ ...styles, height: Number(e.target.value) })} className="w-full accent-purple-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Spacing Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('spacing')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Spacing
                                        {openSections.spacing ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.spacing && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Container Padding ({styles.containerPadding ?? 16}px)</label>
                                                    <input type="range" min="0" max="60" value={styles.containerPadding ?? 16} onChange={(e) => setStyles({ ...styles, containerPadding: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Message Separation ({styles.margin ?? 8}px)</label>
                                                    <input type="range" min="0" max="40" value={styles.margin ?? 8} onChange={(e) => setStyles({ ...styles, margin: Number(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Screen Position Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('screenPos')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Screen Position
                                        {openSections.screenPos ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.screenPos && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BEHAVIOR TAB */}
                        {activeTab === "behavior" && (
                            <div className="space-y-2 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Visibility & Testing Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('visibility')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Visibility & Testing
                                        {openSections.visibility ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.visibility && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
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
                                        </div>
                                    )}
                                </div>

                                {/* Moderation Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('moderation')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Moderation
                                        {openSections.moderation ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.moderation && (
                                        <div className="p-4 border-t border-white/5 space-y-1">
                                            <label className="text-xs text-gray-400">Ignored Users (separated by comma)</label>
                                            <textarea
                                                value={ignoredUsersRaw}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setIgnoredUsersRaw(val);
                                                    setStyles({ ...styles, ignoredUsers: val.split(',').map(s => s.trim()).filter(s => s) });
                                                }}
                                                className="w-full bg-neutral-800 rounded p-2 text-sm border border-white/10 h-24 resize-none placeholder:text-gray-600 focus:border-purple-500 outline-none"
                                                placeholder="StreamElements, Nightbot"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Animations Section */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('animations')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Animations
                                        {openSections.animations ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>

                                    {openSections.animations && (
                                        <div className="p-4 border-t border-white/5 space-y-3">
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 space-y-3">
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            className={`w-full py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2 shadow-lg ${hasUnsavedChanges
                                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20 cursor-pointer"
                                : "bg-neutral-800 text-gray-500 cursor-not-allowed border border-white/5"
                                } ${isSaved ? "!bg-green-600 !text-white" : ""}`}
                        >
                            {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
                            {isSaved ? "Saved Successfully!" : (hasUnsavedChanges ? "Save Changes" : "No Changes to Save")}
                        </button>

                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`w-full py-2 rounded-lg text-xs border transition-colors flex justify-center items-center gap-2 ${showPreview ? "bg-purple-900/20 border-purple-500/50 text-purple-300" : "bg-neutral-800 border-white/10 text-gray-400 hover:bg-neutral-700"}`}
                        >
                            {showPreview ? "Hide Preview" : "Show Preview in Dashboard"}
                        </button>
                    </div>
                </div>

                {/* Toasts Container */}
                <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100]">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border animate-in slide-in-from-right-full fade-in duration-300 ${toast.type === 'success' ? 'bg-neutral-900 border-green-500/50 text-green-400' :
                                toast.type === 'error' ? 'bg-neutral-900 border-red-500/50 text-red-400' :
                                    'bg-neutral-900 border-blue-500/50 text-blue-400'
                                }`}
                        >
                            {toast.type === 'success' && <CheckCircle size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'info' && <Settings size={18} />}
                            <span className="text-sm font-medium text-white">{toast.message}</span>
                            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* PREVIEW PANEL */}
                {
                    showPreview && (
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
                    )
                }
            </div >
        </div >
    );
}
