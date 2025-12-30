"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, ReactNode } from "react";
import tmi from "tmi.js";
import { Send, MessageSquare, AlertCircle, RefreshCw, Settings, X, Type, Sun, Moon, Layout, Smile } from "lucide-react";
import EmotePicker from "@/components/chat/EmotePicker";

export default function LiveDashboardPage() {
    const { data: session } = useSession();
    const [badgeMap, setBadgeMap] = useState<Record<string, Record<string, string>>>({}); // set_id -> version -> url
    const [client, setClient] = useState<tmi.Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const tmiClientRef = useRef<tmi.Client | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // View Settings
    const [showSettings, setShowSettings] = useState(false);
    const [viewSettings, setViewSettings] = useState({
        fontSize: 14,
        fontFamily: 'Inter',
        isBold: false,
        showBorders: false,
        theme: 'dark'
    });

    const [focusedMessage, setFocusedMessage] = useState<any | null>(null);
    const [showEmotePicker, setShowEmotePicker] = useState(false);

    const parseMessage = (text: string, emotes: any) => {
        if (!emotes) return text;

        const parts: (string | ReactNode)[] = [];
        let lastIndex = 0;

        // 1. Flatten into array of { id, start, end }
        const locations: { id: string, start: number, end: number }[] = [];
        Object.entries(emotes).forEach(([id, ranges]: [string, any]) => {
            ranges.forEach((range: string) => {
                const [start, end] = range.split("-").map(Number);
                locations.push({ id, start, end: end + 1 });
            });
        });

        // 2. Sort by start index
        locations.sort((a, b) => a.start - b.start);

        // 3. Build parts
        locations.forEach((loc) => {
            if (loc.start > lastIndex) {
                parts.push(text.slice(lastIndex, loc.start));
            }
            parts.push(
                <img
                    key={`${loc.id}-${loc.start}`}
                    src={`https://static-cdn.jtvnw.net/emoticons/v2/${loc.id}/default/dark/1.0`}
                    alt=""
                    className="inline-block align-middle mx-1 h-6 w-auto"
                />
            );
            lastIndex = loc.end;
        });

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts;
    };

    // Load Settings
    useEffect(() => {
        const saved = localStorage.getItem('ponicstream_chat_settings');
        if (saved) {
            try {
                setViewSettings(JSON.parse(saved));
            } catch (e) { console.error("Failed to parse settings", e); }
        }
    }, []);

    const updateSetting = (key: keyof typeof viewSettings, value: any) => {
        const newSettings = { ...viewSettings, [key]: value };
        setViewSettings(newSettings);
        localStorage.setItem('ponicstream_chat_settings', JSON.stringify(newSettings));
    };

    // Fetch Badges
    useEffect(() => {
        if (session?.accessToken && session?.clientId && session?.user?.id) {
            const fetchBadges = async () => {
                try {
                    const headers = {
                        'Client-ID': session.clientId!,
                        'Authorization': `Bearer ${session.accessToken}`
                    };

                    // 1. Get Global Badges
                    const globalRes = await fetch('https://api.twitch.tv/helix/chat/badges/global', { headers });
                    const globalData = await globalRes.json();

                    // 2. Get Channel Badges
                    const channelRes = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${session.user!.id}`, { headers });
                    const channelData = await channelRes.json();

                    const newMap: Record<string, Record<string, string>> = {};

                    // Helper to merge
                    const merge = (data: any[]) => {
                        if (!data) return;
                        data.forEach((set: any) => {
                            if (!newMap[set.set_id]) newMap[set.set_id] = {};
                            set.versions.forEach((v: any) => {
                                newMap[set.set_id][v.id] = v.image_url_1x;
                            });
                        });
                    }

                    merge(globalData.data);
                    merge(channelData.data); // Channel overrides global if same ID

                    setBadgeMap(newMap);
                } catch (e) {
                    console.error("Failed to fetch badges", e);
                }
            };
            fetchBadges();
        }
    }, [session]);

    // Initial Connection
    useEffect(() => {
        if (session?.accessToken && session?.user?.name) {
            const channelName = session.user.name.toLowerCase();

            // Cleanup any existing client before creating a new one
            if (tmiClientRef.current) {
                tmiClientRef.current.disconnect().catch(() => { });
                tmiClientRef.current = null;
            }

            const clientInstance = new tmi.Client({
                options: { debug: true, messagesLogLevel: "info" },
                connection: {
                    reconnect: true,
                    secure: true,
                },
                identity: {
                    username: session.user.name,
                    password: `oauth:${session.accessToken}`,
                },
                channels: [channelName],
            });

            tmiClientRef.current = clientInstance;
            setClient(clientInstance);
            setConnectionError(null);

            clientInstance.connect().then(() => {
                // Check if this instance is still main
                if (tmiClientRef.current === clientInstance) {
                    setIsConnected(true);
                    setConnectionError(null);
                }
            }).catch((err) => {
                console.warn("TMI Connection Failed:", err);
                if (tmiClientRef.current === clientInstance) {
                    setConnectionError(err instanceof Error ? err.message : "Unable to connect to Twitch Chat");
                    setIsConnected(false);
                }
            });

            clientInstance.on("message", (channel, tags, message, self) => {
                // Deduplicate explicitly
                setMessages(prev => {
                    // Unique ID strategy: Preferred ID -> Username+Message+Time content hash fallback
                    const id = tags.id || `${tags.username}-${message}-${Date.now()}`;

                    // Stronger check: If we have an ID, check for it.
                    if (tags.id && prev.some(m => m.tags.id === tags.id)) return prev;

                    // Fallback check: Check for same content from same user within last 2 seconds (debounce echoes)
                    const isDuplicateContent = prev.some(m =>
                        m.tags.username === tags.username &&
                        m.message === message &&
                        (Date.now() - m.timestamp) < 2000
                    );

                    if (!tags.id && isDuplicateContent) return prev;
                    if (tags.id) {
                        // Sometimes TMI sends message without ID then with ID? 
                        // Or maybe we received a 'optimistic' one before? 
                        // If we find a message with same content from same user with NO ID, replace it?
                        // For now, just ignoring duplicates is safer.
                    }

                    return [...prev.slice(-100), { channel, tags, message, self, id, timestamp: Date.now() }];
                });
            });

            clientInstance.on("messagedeleted", (channel, username, deletedMessage, userstate) => {
                const targetId = userstate["target-msg-id"];
                if (targetId) {
                    setMessages(prev => prev.filter(m => m.id !== targetId));
                }
            });

            clientInstance.on("timeout", (channel, username, reason, duration) => {
                setMessages(prev => prev.filter(m => m.tags.username !== username));
            });

            clientInstance.on("ban", (channel, username, reason) => {
                setMessages(prev => prev.filter(m => m.tags.username !== username));
            });

            clientInstance.on("clearchat", (channel) => {
                setMessages([]);
            });

            clientInstance.on("disconnected", (reason) => {
                console.warn("Disconnected:", reason);
                if (tmiClientRef.current === clientInstance) {
                    setIsConnected(false);
                }
            });

            return () => {
                // Cleanup function
                clientInstance.disconnect().catch(() => { });
                if (tmiClientRef.current === clientInstance) {
                    tmiClientRef.current = null;
                    setIsConnected(false);
                }
            };
        }
    }, [session?.accessToken, session?.user?.name, retryCount]);

    // Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (client && isConnected && inputValue.trim()) {
            const channel = session?.user?.name!.toLowerCase();
            try {
                await client.say(channel!, inputValue);
                setInputValue("");
            } catch (err) {
                console.error("Failed to send message:", err);
            }
        }
    };



    if (!session) return <div className="p-8 text-white">Please log in to use the Live Dashboard.</div>;

    return (
        <div className={`flex h-screen ${viewSettings.theme === 'light' ? 'bg-white text-black' : 'bg-[#09090b] text-white'} overflow-hidden transition-colors`}>
            <div className="flex-1 flex flex-col max-w-full relative">
                <div className={`p-4 border-b ${viewSettings.theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-[#18181b]'} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold flex items-center gap-2"><MessageSquare size={18} /> Live Chat</h2>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1.5 rounded-md transition-colors ${viewSettings.theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                            title="Chat Appearance"
                        >
                            <Settings size={16} />
                        </button>
                    </div>

                    <div className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>

                    {/* Settings Modal Overlay */}
                    {showSettings && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
                            <div
                                className={`w-80 p-6 rounded-xl shadow-2xl border ${viewSettings.theme === 'light' ? 'bg-white border-gray-200 text-black' : 'bg-[#18181b] border-white/10 text-white'}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg">Chat Appearance</h3>
                                    <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-500/20 rounded"><X size={18} /></button>
                                </div>

                                <div className="space-y-6">
                                    {/* Font Size */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex justify-between">
                                            Font Size <span className="text-purple-500">{viewSettings.fontSize}px</span>
                                        </label>
                                        <input
                                            type="range" min="12" max="32" step="1"
                                            value={viewSettings.fontSize}
                                            onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                                            className="w-full accent-purple-600 h-2 bg-gray-200/20 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    {/* Typography */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold uppercase tracking-wider opacity-70">Typography</label>
                                        <select
                                            value={viewSettings.fontFamily}
                                            onChange={(e) => updateSetting('fontFamily', e.target.value)}
                                            className={`w-full p-2.5 text-sm rounded-lg border ${viewSettings.theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10'} focus:outline-none focus:border-purple-500`}
                                        >
                                            <option value="Inter">Inter (Default)</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Open Sans">Open Sans</option>
                                            <option value="Courier New">Monospace</option>
                                            <option value="Georgia">Serif</option>
                                        </select>
                                    </div>

                                    {/* Toggles Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => updateSetting('isBold', !viewSettings.isBold)}
                                            className={`p-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${viewSettings.isBold ? 'border-purple-500 text-purple-500 bg-purple-500/10' : 'border-transparent bg-gray-500/5 hover:bg-gray-500/10'}`}
                                        >
                                            <Type size={16} /> Bold Text
                                        </button>

                                        <button
                                            onClick={() => updateSetting('showBorders', !viewSettings.showBorders)}
                                            className={`p-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${viewSettings.showBorders ? 'border-purple-500 text-purple-500 bg-purple-500/10' : 'border-transparent bg-gray-500/5 hover:bg-gray-500/10'}`}
                                        >
                                            <Layout size={16} /> Borders
                                        </button>
                                    </div>

                                    {/* Theme Toggle */}
                                    <div className="pt-4 border-t border-dashed border-gray-500/20">
                                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3 block">Theme</label>
                                        <div className="flex bg-gray-500/10 rounded-lg p-1">
                                            <button
                                                onClick={() => updateSetting('theme', 'light')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${viewSettings.theme === 'light' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-inherit'}`}
                                            >
                                                <Sun size={16} /> Light
                                            </button>
                                            <button
                                                onClick={() => updateSetting('theme', 'dark')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${viewSettings.theme === 'dark' ? 'bg-gray-800 shadow text-white' : 'text-gray-500 hover:text-inherit'}`}
                                            >
                                                <Moon size={16} /> Dark
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                    {connectionError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-red-200 mb-4">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertCircle size={20} />
                                <span>Connection Failed</span>
                            </div>
                            <p className="text-sm text-center opacity-80">{connectionError}</p>
                            <button
                                onClick={() => {
                                    setConnectionError(null);
                                    setRetryCount(c => c + 1);
                                }}
                                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded transition-colors text-sm"
                            >
                                <RefreshCw size={14} /> Retry Connection
                            </button>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx}
                            className={`group relative p-2 rounded-lg transition-colors -mx-2 cursor-pointer ${viewSettings.theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/5'} ${viewSettings.showBorders ? (viewSettings.theme === 'light' ? 'border-b border-gray-100' : 'border-b border-white/5') : ''}`}
                            style={{
                                fontSize: `${viewSettings.fontSize}px`,
                                fontFamily: viewSettings.fontFamily,
                                fontWeight: viewSettings.isBold ? 'bold' : 'normal'
                            }}
                            onClick={() => setFocusedMessage(msg)}
                        >
                            {/* Message Header */}
                            <div className="break-words leading-relaxed">
                                <span className="text-[0.75em] opacity-50 mr-2 font-mono font-bold align-middle inline-block">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {msg.tags.badges && (
                                    <span className="inline-flex gap-1 items-center mr-1 align-middle">
                                        {Object.entries(msg.tags.badges).map(([key, version]) => {
                                            const url = badgeMap[key]?.[version as string];
                                            if (!url) return null;

                                            return (
                                                <img
                                                    key={`${key}-${version}`}
                                                    src={url}
                                                    alt={key}
                                                    title={key}
                                                    className="w-4 h-4 object-contain"
                                                />
                                            );
                                        })}
                                    </span>
                                )}

                                <span className="font-bold cursor-pointer hover:text-purple-400 mr-1 align-middle"
                                    style={{ color: msg.tags.color }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://twitch.tv/popout/${session.user?.name}/viewercard/${msg.tags.username}`, '_blank', 'width=400,height=600');
                                    }}
                                >
                                    {msg.tags['display-name']}:
                                </span>
                                <span className="align-middle">
                                    {parseMessage(msg.message, msg.tags.emotes)}
                                </span>

                            </div>


                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className={`p-4 border-t ${viewSettings.theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-[#18181b]'}`}>
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Send a message..."
                            className={`w-full rounded-lg p-3 pl-10 pr-12 text-sm focus:outline-none focus:border-purple-500 resize-none h-12 min-h-[48px] max-h-32 ${viewSettings.theme === 'light' ? 'bg-white border border-gray-200 text-black' : 'bg-black/30 border border-white/10 text-white'}`}
                        />

                        {/* Emote Picker Trigger */}
                        <button
                            onClick={() => setShowEmotePicker(!showEmotePicker)}
                            className="absolute left-2 top-3 text-gray-400 hover:text-purple-500 transition-colors"
                        >
                            <Smile size={20} />
                        </button>

                        {/* Emote Picker Backdrop */}
                        {showEmotePicker && (
                            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowEmotePicker(false)} />
                        )}

                        {/* Emote Picker Popover - Persistent Mount */}
                        <div className={`absolute bottom-14 left-0 z-50 ${showEmotePicker ? 'block' : 'hidden'}`}>
                            <EmotePicker
                                onEmoteSelect={(emote) => {
                                    setInputValue(prev => prev + (prev ? " " : "") + emote);
                                    // kept open on select as requested
                                }}
                                onClose={() => setShowEmotePicker(false)}
                                theme={viewSettings.theme as 'light' | 'dark'}
                            />
                        </div>

                        <button
                            onClick={sendMessage}
                            disabled={!isConnected || !inputValue.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-purple-600 rounded-md text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>


            {/* Focused Message Modal */}
            {focusedMessage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                    onClick={() => setFocusedMessage(null)}
                >
                    <div
                        className={`max-w-4xl w-full p-8 rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] ${viewSettings.theme === 'light' ? 'bg-white text-black' : 'bg-[#09090b] border border-white/10 text-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-4 border-b border-gray-500/20 pb-4 mb-4 flex-shrink-0">
                            {focusedMessage.tags.badges && (
                                <div className="flex gap-2">
                                    {Object.entries(focusedMessage.tags.badges).map(([key, version]) => {
                                        const url = badgeMap[key]?.[version as string];
                                        if (!url) return null;
                                        return <img key={`${key}-${version}`} src={url} alt={key} className="w-8 h-8 object-contain" />;
                                    })}
                                </div>
                            )}
                            <h2
                                className="text-2xl font-bold truncate"
                                style={{ color: focusedMessage.tags.color }}
                            >
                                {focusedMessage.tags['display-name']}
                            </h2>

                            <div className="ml-auto flex items-center gap-4">
                                <span className="text-xl font-bold opacity-70 font-mono">
                                    {new Date(focusedMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                    onClick={() => setFocusedMessage(null)}
                                    className={`p-2 rounded-full transition-colors ${viewSettings.theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'}`}
                                >
                                    <X size={28} />
                                </button>
                            </div>
                        </div>

                        {/* Large Message Content */}
                        <div className="text-3xl font-bold leading-tight break-words overflow-y-auto pr-2 custom-scrollbar">
                            {parseMessage(focusedMessage.message, focusedMessage.tags.emotes)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
