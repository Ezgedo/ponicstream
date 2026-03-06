"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
    Languages, Save, ArrowRight, Settings, LogOut,
    FileJson, ChevronDown, Download, ClipboardCopy,
    Upload, Clipboard, Copy, ExternalLink, Activity,
    ArrowUp, ArrowDown, Plus, X,
    CheckCircle, AlertCircle, Info, Trash2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_TRANSLATOR_SETTINGS, TranslatorSettings } from "@/utils/translation";

const LANGUAGES = [
    { code: 'auto', name: 'Detect Automatically' },
    { code: 'es', name: 'Spanish' },
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
];

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function TranslatorConfigPage() {
    const { data: session, status } = useSession();
    const [settings, setSettings] = useState<TranslatorSettings>(DEFAULT_TRANSLATOR_SETTINGS);
    const [lastSavedSettings, setLastSavedSettings] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [showConfigDropdown, setShowConfigDropdown] = useState(false);
    const [ignoredInput, setIgnoredInput] = useState('');
    const [ignoredUserInput, setIgnoredUserInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const configDropdownRef = useRef<HTMLDivElement>(null);

    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        status: false,
        detection: false,
        ignored: false,
        ignoredUsers: false,
        commands: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Load settings
    useEffect(() => {
        const saved = localStorage.getItem('ponicstream_translator_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = { ...DEFAULT_TRANSLATOR_SETTINGS, ...parsed };
                setSettings(merged);
                setLastSavedSettings(JSON.stringify(merged));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        } else {
            setLastSavedSettings(JSON.stringify(DEFAULT_TRANSLATOR_SETTINGS));
        }
    }, []);

    // Dirty Check
    useEffect(() => {
        const currentString = JSON.stringify(settings);
        setHasUnsavedChanges(currentString !== lastSavedSettings);
    }, [settings, lastSavedSettings]);

    // Dropdown close logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (configDropdownRef.current && !configDropdownRef.current.contains(event.target as Node)) {
                setShowConfigDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const handleSave = () => {
        setIsSaving(true);
        const settingsString = JSON.stringify(settings);
        localStorage.setItem('ponicstream_translator_settings', settingsString);
        setLastSavedSettings(settingsString);

        // Dispatch custom event for the TranslationBot
        window.dispatchEvent(new CustomEvent('ponicstream_translator_update'));

        addToast("Settings saved successfully!", "success");
        setTimeout(() => setIsSaving(false), 500);
    };

    const applyConfig = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            // Basic validation
            if (typeof parsed.enabled !== 'boolean') {
                addToast("Invalid configuration format.", "error");
                return;
            }
            setSettings({ ...DEFAULT_TRANSLATOR_SETTINGS, ...parsed });
            addToast("Configuration loaded successfully!", "success");
        } catch (error) {
            addToast("Failed to parse config.", "error");
        }
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "translator-config.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addToast("Configuration exported!", "success");
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files[0]) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                if (e.target?.result) applyConfig(e.target.result as string);
            };
        }
    };

    const handleCopyJson = () => {
        navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
        addToast("Configuration copied to clipboard!", "success");
    };

    const handlePasteJson = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) applyConfig(text);
        } catch (err) {
            addToast("Could not read clipboard.", "error");
        }
    };

    const addIgnoredLanguage = () => {
        if (ignoredInput && !settings.ignoredLanguages.includes(ignoredInput)) {
            setSettings({
                ...settings,
                ignoredLanguages: [...settings.ignoredLanguages, ignoredInput]
            });
            setIgnoredInput('');
        }
    };

    const removeIgnoredLanguage = (lang: string) => {
        setSettings({
            ...settings,
            ignoredLanguages: settings.ignoredLanguages.filter(l => l !== lang)
        });
    };

    const addIgnoredUser = () => {
        const user = ignoredUserInput.trim().toLowerCase().replace('@', '');
        if (user && !settings.ignoredUsers?.includes(user)) {
            setSettings({
                ...settings,
                ignoredUsers: [...(settings.ignoredUsers || []), user]
            });
            setIgnoredUserInput('');
        }
    };

    const removeIgnoredUser = (user: string) => {
        setSettings({
            ...settings,
            ignoredUsers: (settings.ignoredUsers || []).filter(u => u !== user)
        });
    };

    const addCommand = () => {
        setSettings({
            ...settings,
            commands: [...settings.commands, { trigger: '!ts', target: 'en' }]
        });
    };

    const updateCommand = (index: number, updates: Partial<{ trigger: string, target: string }>) => {
        const newCommands = [...settings.commands];
        newCommands[index] = { ...newCommands[index], ...updates };
        setSettings({ ...settings, commands: newCommands });
    };

    const removeCommand = (index: number) => {
        setSettings({
            ...settings,
            commands: settings.commands.filter((_, i) => i !== index)
        });
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
                        <Languages className="text-purple-500" /> Translator Settings
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

            <div className="max-w-2xl mx-auto w-full bg-neutral-900 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[80vh] transition-all duration-300">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Bot Status Section */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={() => toggleSection('status')}
                            className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                        >
                            Bot Status
                            {openSections.status ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                        {openSections.status && (
                            <div className="p-4 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-white/5">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium block">Automatic Translation</span>
                                        <span className="text-[10px] text-gray-400 block">Captures and replies to chat messages</span>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.enabled ? 'bg-purple-600' : 'bg-neutral-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all`} style={{ left: settings.enabled ? '22px' : '2px' }} />
                                    </button>
                                </div>
                                <div className="p-3 bg-purple-900/10 rounded-lg border border-purple-500/20 flex gap-3">
                                    <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-gray-400 leading-relaxed">
                                        This feature runs 100% in the cloud/background. It uses your permissions to post translations. Keep this tab open for the best experience.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Routing & Detection Section */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <button
                            onClick={() => toggleSection('detection')}
                            className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                        >
                            Routing & Detection
                            {openSections.detection ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                        {openSections.detection && (
                            <div className="p-4 border-t border-white/5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Target (Translate To)</label>
                                        <select
                                            value={settings.targetLanguage}
                                            onChange={(e) => setSettings({ ...settings, targetLanguage: e.target.value })}
                                            className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                        >
                                            {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Source (Translate From)</label>
                                        <select
                                            value={settings.sourceLanguages}
                                            onChange={(e) => setSettings({ ...settings, sourceLanguages: e.target.value })}
                                            className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                        >
                                            {LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Language Filters Section */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <button
                            onClick={() => toggleSection('ignored')}
                            className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                        >
                            Language Filters
                            {openSections.ignored ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                        {openSections.ignored && (
                            <div className="p-4 border-t border-white/5 space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Min. Words ({settings.minWords})</label>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={settings.minWords}
                                        onChange={(e) => setSettings({ ...settings, minWords: parseInt(e.target.value) })}
                                        className="w-full accent-purple-600 bg-neutral-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <p className="text-[9px] text-gray-500 italic">Prevents spamming translations for single words or short greetings.</p>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-white/5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Blacklisted Languages</label>
                                    <div className="flex flex-wrap gap-2">
                                        {settings.ignoredLanguages.map(lang => (
                                            <span key={lang} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 text-[10px] font-bold rounded border border-white/5 text-gray-300">
                                                {LANGUAGES.find(l => l.code === lang)?.name || lang.toUpperCase()}
                                                <button onClick={() => removeIgnoredLanguage(lang)} className="hover:text-red-400 transition-colors">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={ignoredInput}
                                            onChange={(e) => setIgnoredInput(e.target.value)}
                                            className="flex-1 bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        >
                                            <option value="">Choose to ignore...</option>
                                            {LANGUAGES.filter(l => l.code !== 'auto' && !settings.ignoredLanguages.includes(l.code)).map(lang => (
                                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={addIgnoredLanguage}
                                            className="px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-white/10 transition-colors flex items-center justify-center"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ignored Users Section */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-bottom-2 duration-600">
                        <button
                            onClick={() => toggleSection('ignoredUsers')}
                            className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                        >
                            Ignored Users
                            {openSections.ignoredUsers ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                        {openSections.ignoredUsers && (
                            <div className="p-4 border-t border-white/5 space-y-5">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Users excluded from translation</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(settings.ignoredUsers || []).map(user => (
                                            <span key={user} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 text-[10px] font-bold rounded border border-white/5 text-gray-300">
                                                @{user}
                                                <button onClick={() => removeIgnoredUser(user)} className="hover:text-red-400 transition-colors">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                        {(settings.ignoredUsers || []).length === 0 && (
                                            <span className="text-[10px] text-gray-500 italic px-1">No users ignored.</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={ignoredUserInput}
                                            onChange={(e) => setIgnoredUserInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addIgnoredUser()}
                                            placeholder="Twitch username..."
                                            className="flex-1 bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={addIgnoredUser}
                                            className="px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-white/10 transition-colors flex items-center justify-center"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-500 italic">Messages from these users will be completely ignored by the translation bot.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick-Translation Commands Section */}
                    <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <button
                            onClick={() => toggleSection('commands')}
                            className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                        >
                            Quick-Translation Commands
                            {openSections.commands ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                        {openSections.commands && (
                            <div className="p-4 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-white/5">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium block">Enable Commands</span>
                                        <span className="text-[10px] text-gray-400 block">Trigger translations with chat commands (e.g., !tsen Hello)</span>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, commandsEnabled: !settings.commandsEnabled })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.commandsEnabled ? 'bg-purple-600' : 'bg-neutral-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all`} style={{ left: settings.commandsEnabled ? '22px' : '2px' }} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Active Commands</label>
                                        <button
                                            onClick={addCommand}
                                            className="p-1 px-2 text-[10px] bg-purple-600 hover:bg-purple-500 rounded text-white font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Plus size={10} /> Add Command
                                        </button>
                                    </div>

                                    <div className="grid gap-2">
                                        {settings.commands.map((cmd, idx) => (
                                            <div key={idx} className="flex gap-2 p-2 bg-neutral-800/50 border border-white/5 rounded-lg items-center group">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={cmd.trigger}
                                                        onChange={(e) => updateCommand(idx, { trigger: e.target.value })}
                                                        className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                                                        placeholder="!command"
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <select
                                                        value={cmd.target}
                                                        onChange={(e) => updateCommand(idx, { target: e.target.value })}
                                                        className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                                                    >
                                                        {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                                                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => removeCommand(idx)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {settings.commands.length === 0 && (
                                            <div className="text-center py-6 border border-dashed border-white/10 rounded-lg text-gray-500 text-[10px]">
                                                No commands configured. Click "Add Command" to start.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 bg-blue-900/10 rounded-lg border border-blue-500/20 flex gap-3">
                                    <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-blue-300 font-bold uppercase">Pro Tip</p>
                                        <p className="text-[10px] text-gray-400 leading-relaxed">
                                            Manual commands override language filters and word counts. They are great for translating specific requests from your audience.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 bg-neutral-900 border-t border-white/10 flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${hasUnsavedChanges
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/10 active:scale-[0.98]"
                            : "bg-neutral-800 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : hasUnsavedChanges ? (
                            <>
                                <Save size={18} /> Save Changes
                            </>
                        ) : (
                            <>
                                <Save size={18} className="opacity-50" /> No Changes to Save
                            </>
                        )}
                    </button>
                    <div className="text-[10px] text-center text-gray-500">
                        Changes are applied instantly to the background bot after saving.
                    </div>
                </div>
            </div>

            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[200px] border ${toast.type === 'success' ? 'bg-green-600/90 border-green-500 text-white' :
                                toast.type === 'error' ? 'bg-red-600/90 border-red-500 text-white' :
                                    'bg-neutral-800/90 border-white/10 text-white'
                                } backdrop-blur-md`}
                        >
                            {toast.type === 'success' ? <CheckCircle size={18} /> :
                                toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                            <span className="text-sm font-medium">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
