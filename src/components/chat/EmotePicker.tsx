"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Smile, Clock, Star, Zap, Twitch } from 'lucide-react';

interface Emote {
    id: string;
    name: string;
    images: {
        url_1x: string;
        url_2x: string;
        url_4x: string;
    };
    emote_type: string;
    emote_set_id: string;
    owner_id?: string;
}

interface EmotePickerProps {
    onEmoteSelect: (emoteName: string) => void;
    onClose: () => void;
    theme: 'light' | 'dark';
}

export default function EmotePicker({ onEmoteSelect, onClose, theme }: EmotePickerProps) {
    const { data: session } = useSession();
    const [emotes, setEmotes] = useState<Emote[]>([]);
    const [recents, setRecents] = useState<Emote[]>([]);
    const [activeTab, setActiveTab] = useState<'recent' | 'subs' | 'global'>('subs');
    const [loading, setLoading] = useState(true);
    const [channelNames, setChannelNames] = useState<Record<string, string>>({});

    useEffect(() => {
        // Load recents
        const savedRecents = localStorage.getItem('ponicstream_recent_emotes');
        if (savedRecents) {
            try {
                setRecents(JSON.parse(savedRecents));
            } catch (e) { console.error("Bad recents", e); }
        }

        // Fetch user emotes
        if (session?.accessToken && session?.user?.id) {
            const fetchEmotes = async () => {
                try {
                    let allEmotes: Emote[] = [];
                    let cursor: string | undefined = undefined;
                    const userId = session?.user?.id as string; // Assert string since we checked in if()

                    do {
                        const params = new URLSearchParams();
                        params.append('user_id', userId);
                        // Removed broadcaster_id redundant param if it is same as user_id for fetching user emotes
                        if (cursor) params.append('after', cursor);

                        const res = await fetch(`https://api.twitch.tv/helix/chat/emotes/user?${params.toString()}`, {
                            headers: {
                                'Client-ID': session.clientId!,
                                'Authorization': `Bearer ${session.accessToken}`
                            }
                        });

                        const data = await res.json();
                        if (data.data) {
                            allEmotes = [...allEmotes, ...data.data];
                        }
                        cursor = data.pagination?.cursor;
                    } while (cursor);

                    // Dedup emotes by ID to fix key warnings
                    const uniqueEmotes = Array.from(new Map(allEmotes.map(e => [e.id, e])).values());
                    setEmotes(uniqueEmotes);

                    // 2. Fetch Channel Names for owner_ids
                    const ownerIds = Array.from(new Set(uniqueEmotes.map(e => e.owner_id).filter(Boolean))) as string[];

                    // Filter for valid numeric IDs only (Twitch API requirement for id parameter)
                    const numericIds = ownerIds.filter(id => /^\d+$/.test(id));
                    console.log("Fetching names for numeric User IDs:", numericIds);

                    if (numericIds.length > 0) {
                        // Chunk into 50s
                        const chunks = [];
                        for (let i = 0; i < numericIds.length; i += 50) {
                            chunks.push(numericIds.slice(i, i + 50));
                        }

                        // Initialize with manual mappings
                        const newNames: Record<string, string> = {};
                        if (ownerIds.includes('twitch')) newNames['twitch'] = 'Twitch Global';
                        if (ownerIds.includes('0')) newNames['0'] = 'Twitch Global';

                        for (const chunk of chunks) {
                            const params = new URLSearchParams();
                            chunk.forEach(id => params.append('id', id));

                            try {
                                const userRes = await fetch(`https://api.twitch.tv/helix/users?${params.toString()}`, {
                                    headers: {
                                        'Client-ID': session.clientId!,
                                        'Authorization': `Bearer ${session.accessToken}`
                                    }
                                });

                                if (!userRes.ok) {
                                    console.error(`Failed to fetch users: ${userRes.status}`, await userRes.text());
                                    continue;
                                }

                                const userData = await userRes.json();
                                userData.data?.forEach((u: any) => {
                                    newNames[u.id] = u.display_name;
                                });
                            } catch (err) {
                                console.error("Failed to fetch user names", err);
                            }
                        }
                        setChannelNames(newNames);
                    }

                } catch (e) {
                    console.error("Failed to fetch emotes", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchEmotes();
        }
    }, [session]);

    const handleSelect = (emote: Emote) => {
        onEmoteSelect(emote.name);

        // Update Recents
        const newRecents = [emote, ...recents.filter(e => e.id !== emote.id)].slice(0, 20);
        setRecents(newRecents);
        localStorage.setItem('ponicstream_recent_emotes', JSON.stringify(newRecents));
    };

    // Grouping
    const subEmotes = emotes.filter(e => e.emote_type === 'subscriptions');
    const bitEmotes = emotes.filter(e => e.emote_type === 'bitstier');
    const followerEmotes = emotes.filter(e => e.emote_type === 'follower');
    const globalEmotes = emotes.filter(e => e.emote_type === 'globals' || e.emote_type === 'smilies');

    // Combine for display based on tab
    const getDisplayEmotes = () => {
        if (activeTab === 'recent') return recents;
        if (activeTab === 'global') return globalEmotes;
        // Subs tab combines Subs, Bits, Follower
        return [...followerEmotes, ...subEmotes, ...bitEmotes];
    };

    return (
        <div className={`w-80 h-96 flex flex-col rounded-xl shadow-2xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#18181b] border-white/10 text-white'}`}>
            {/* Header / Tabs */}
            <div className={`p-2 border-b flex gap-1 ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'}`}>
                <button
                    onClick={() => setActiveTab('recent')}
                    className={`p-2 rounded hover:bg-black/5 flex-1 flex justify-center ${activeTab === 'recent' ? 'text-purple-500 bg-purple-500/10' : 'opacity-50'}`}
                    title="Recent"
                >
                    <Clock size={18} />
                </button>
                <button
                    onClick={() => setActiveTab('subs')}
                    className={`p-2 rounded hover:bg-black/5 flex-1 flex justify-center ${activeTab === 'subs' ? 'text-purple-500 bg-purple-500/10' : 'opacity-50'}`}
                    title="Channel & Subs"
                >
                    <Star size={18} />
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    className={`p-2 rounded hover:bg-black/5 flex-1 flex justify-center ${activeTab === 'global' ? 'text-purple-500 bg-purple-500/10' : 'opacity-50'}`}
                    title="Twitch Global"
                >
                    <Twitch size={18} />
                </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {loading ? (
                    <div className="h-full flex items-center justify-center opacity-50">Loading emotes...</div>
                ) : (
                    <>
                        {activeTab === 'subs' ? (
                            // Grouped View for Subs
                            Object.entries(
                                [...followerEmotes, ...subEmotes, ...bitEmotes].reduce((acc, emote) => {
                                    const key = emote.owner_id || 'other';
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(emote);
                                    return acc;
                                }, {} as Record<string, Emote[]>)
                            ).sort((a, b) => {
                                // Sort: Self first (if possible), then alphabet
                                const nameA = channelNames[a[0]] || (a[0] === 'twitch' || a[0] === '0' ? 'Twitch Global' : a[0]);
                                const nameB = channelNames[b[0]] || (b[0] === 'twitch' || b[0] === '0' ? 'Twitch Global' : b[0]);
                                return nameA.localeCompare(nameB);
                            }).map(([ownerId, groupEmotes]) => (
                                <div key={ownerId} className="mb-4">
                                    <h4 className="text-xs font-bold opacity-50 uppercase tracking-wider mb-2 px-1 text-purple-400">
                                        {channelNames[ownerId] || (ownerId === 'other' ? 'Other Channels' : (ownerId === 'twitch' || ownerId === '0' ? 'Twitch Global' : `Channel ${ownerId}`))}
                                    </h4>
                                    <div className="grid grid-cols-5 gap-2">
                                        {groupEmotes.map(emote => (
                                            <button
                                                key={emote.id}
                                                onClick={() => handleSelect(emote)}
                                                className="aspect-square flex items-center justify-center hover:bg-black/10 rounded p-1 transition-colors relative group"
                                                title={emote.name}
                                            >
                                                <img
                                                    src={emote.images?.url_2x || emote.images?.url_1x || `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0`}
                                                    alt={emote.name}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Flat Grid for Recent / Global
                            <div className="grid grid-cols-5 gap-2">
                                {getDisplayEmotes().length === 0 ? (
                                    <div className="col-span-5 text-center py-10 opacity-50 text-sm">No emotes found</div>
                                ) : (
                                    getDisplayEmotes().map(emote => (
                                        <button
                                            key={emote.id}
                                            onClick={() => handleSelect(emote)}
                                            className="aspect-square flex items-center justify-center hover:bg-black/10 rounded p-1 transition-colors relative group"
                                            title={emote.name}
                                        >
                                            <img
                                                src={emote.images?.url_2x || emote.images?.url_1x || `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/2.0`}
                                                alt={emote.name}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1 text-[10px] opacity-50 text-center border-t border-white/5">
                {activeTab === 'subs' ? 'Showing Sub, Bit & Follower Emotes' : activeTab === 'recent' ? 'Recently Used' : 'Global Twitch Emotes'}
            </div>
        </div>
    );
}
