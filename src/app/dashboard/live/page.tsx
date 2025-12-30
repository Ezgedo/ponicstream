"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import tmi from "tmi.js";
import { Send, Settings, UserX, Shield, Pin, Trash2, Ban, Clock, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

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
                    const id = tags.id || `${Date.now()}-${Math.random()}`; // Fallback ID if missing
                    if (prev.some(m => m.id === id)) return prev;
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

    const handleAction = async (action: string, username: string, extra?: any) => {
        if (!client) return;
        const channel = session?.user?.name?.toLowerCase()!;

        console.log(`Executing ${action} on ${channel} for ${username}`, extra);

        try {
            switch (action) {
                case 'timeout':
                    await client.timeout(channel, username, 600, "Timed out via Live Dashboard");
                    break;
                case 'ban':
                    await client.ban(channel, username, "Banned via Live Dashboard");
                    break;
                case 'delete':
                    if (extra?.msgId) {
                        try {
                            const trimmedMsgId = extra.msgId.trim();

                            // Verify User ID first
                            const userRes = await fetch('https://api.twitch.tv/helix/users', {
                                headers: {
                                    'Client-ID': session.clientId!,
                                    'Authorization': `Bearer ${session.accessToken}`
                                }
                            });

                            if (!userRes.ok) {
                                console.warn("Failed to fetch user info for delete:", await userRes.text());
                                return;
                            }

                            const userData = await userRes.json();
                            const realUserId = userData.data?.[0]?.id;

                            console.log(`Deleting via API. SessionID: ${session.user?.id}, RealID: ${realUserId}, Msg: ${trimmedMsgId}`);

                            if (!realUserId) {
                                console.warn("Could not resolve Real User ID");
                                return;
                            }

                            // Use Helix API
                            const res = await fetch(`https://api.twitch.tv/helix/moderation/chat_messages?broadcaster_id=${realUserId}&moderator_id=${realUserId}&message_id=${trimmedMsgId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Client-ID': session.clientId!,
                                    'Authorization': `Bearer ${session.accessToken}`
                                }
                            });

                            if (!res.ok) {
                                const err = await res.text();
                                console.warn("API Delete Failed:", err);

                                // Fallback: try legacy TMI command just in case
                                if (err.includes("Not Found")) {
                                    console.log("Attempting fallback TMI delete...");
                                    await client.say(channel, `/delete ${trimmedMsgId}`);
                                }
                            } else {
                                console.log("Message deleted successfully via API");
                                setMessages(prev => prev.filter(m => m.id !== trimmedMsgId));
                            }
                        } catch (e) {
                            console.warn("Delete API error:", e);
                        }
                    }
                    break;
            }
        } catch (err: any) {
            console.warn("Action failed:", err);
        }
    };

    if (!session) return <div className="p-8 text-white">Please log in to use the Live Dashboard.</div>;

    return (
        <div className="flex h-screen bg-[#09090b] text-white overflow-hidden">
            {/* Left: Chat Feed */}
            <div className="flex-1 flex flex-col max-w-full">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
                    <h2 className="font-bold flex items-center gap-2"><MessageSquare size={18} /> Live Chat</h2>
                    <div className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
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
                        <div key={msg.id || idx} className="group relative hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                            {/* Message Header */}
                            <div className="text-sm text-gray-200 break-words leading-relaxed">
                                <span className="text-xs text-gray-500 mr-2 font-mono font-bold align-middle inline-block">
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
                                    onClick={() => window.open(`https://twitch.tv/popout/${session.user?.name}/viewercard/${msg.tags.username}`, '_blank', 'width=400,height=600')}
                                >
                                    {msg.tags['display-name']}:
                                </span>
                                {(() => {
                                    // Helper to parse emotes
                                    const parseMessage = (text: string, emotes: any) => {
                                        if (!emotes) return text;

                                        const parts: (string | JSX.Element)[] = [];
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
                                                    className="inline-block align-middle mx-1 h-6 w-auto" // Adjusted sizing
                                                />
                                            );
                                            lastIndex = loc.end;
                                        });

                                        if (lastIndex < text.length) {
                                            parts.push(text.slice(lastIndex));
                                        }

                                        return parts;
                                    };

                                    return (
                                        <span className="align-middle">
                                            {parseMessage(msg.message, msg.tags.emotes)}
                                        </span>
                                    );
                                })()}
                            </div>


                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-[#18181b]">
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Send a message..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 pr-12 text-sm focus:outline-none focus:border-purple-500 resize-none h-12 min-h-[48px] max-h-32"
                        />
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


        </div>
    );
}
