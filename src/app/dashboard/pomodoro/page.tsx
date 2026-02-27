"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
    Save, ArrowRight, Settings, LogOut,
    FileJson, ChevronDown, Download, ClipboardCopy,
    Upload, Clipboard, Copy, ExternalLink, Activity,
    ArrowUp, ArrowDown, Plus, X, Play, Pause, Square,
    CheckCircle, AlertCircle, Info, Trash2, Clock, Palette, Music, Terminal, Layout,
    Brain, Coffee, Sparkles, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_POMODORO_SETTINGS, PomodoroSettings, PomodoroCommand, PomodoroPhase } from "@/utils/pomodoro";
import PomodoroWidget from "@/components/overlay/PomodoroWidget";

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const POSITIONS = [
    { id: 'top-left', name: 'Top Left' },
    { id: 'top-right', name: 'Top Right' },
    { id: 'bottom-left', name: 'Bottom Left' },
    { id: 'bottom-right', name: 'Bottom Right' },
];

const FONTS = ['Inter', 'Roboto', 'Montserrat', 'JetBrains Mono', 'Orbitron'];

export default function PomodoroConfigPage() {
    const { data: session, status } = useSession();
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
    const [lastSavedSettings, setLastSavedSettings] = useState<string>(JSON.stringify(DEFAULT_POMODORO_SETTINGS));
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfigDropdown, setShowConfigDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<"appearance" | "layout" | "control">("control");
    const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const configDropdownRef = useRef<HTMLDivElement>(null);

    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        general: false,
        timers: false,
        visuals: false,
        audio: false,
        commands: false,
        dimensions: false,
        screenPos: false,
        spacing: false,
        animations: false,
        theme: false,
        typography: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Load settings
    useEffect(() => {
        const saved = localStorage.getItem('ponicstream_pomodoro_settings');
        if (saved) {
            try {
                let parsed = JSON.parse(saved);

                // MIGRATION: Convert old fixed durations to specific 4-phase slots
                if (!parsed.phases || (parsed.phases.length !== 4 && parsed.workDuration)) {
                    const work = parsed.workDuration || 25;
                    const sBreak = parsed.shortBreakDuration || 5;
                    const lBreak = parsed.longBreakDuration || 15;

                    parsed.phases = [
                        { id: '1', name: 'Focus', duration: work, type: 'work' },
                        { id: '2', name: 'Short Focus', duration: Math.round(work * 0.6), type: 'work' },
                        { id: '3', name: 'Break', duration: sBreak, type: 'break' },
                        { id: '4', name: 'Custom Name', duration: lBreak, type: 'custom' },
                    ];
                }

                // MIGRATION: Remove legacy local sound paths
                if (parsed.endSoundUrl === '/sounds/alarm.mp3') {
                    parsed.endSoundUrl = DEFAULT_POMODORO_SETTINGS.endSoundUrl;
                }

                const merged = { ...DEFAULT_POMODORO_SETTINGS, ...parsed };
                setSettings(merged);
                setLastSavedSettings(JSON.stringify(merged));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        } else {
            setLastSavedSettings(JSON.stringify(DEFAULT_POMODORO_SETTINGS));
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
        localStorage.setItem('ponicstream_pomodoro_settings', settingsString);
        setLastSavedSettings(settingsString);

        // Dispatch custom event for the PomodoroBot and Widget
        window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_update'));

        addToast("Settings saved successfully!", "success");
        setTimeout(() => setIsSaving(false), 500);
    };

    const applyConfig = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            if (typeof parsed.enabled !== 'boolean') {
                addToast("Invalid configuration format.", "error");
                return;
            }
            setSettings({ ...DEFAULT_POMODORO_SETTINGS, ...parsed });
            addToast("Configuration loaded successfully!", "success");
        } catch (error) {
            addToast("Failed to parse config.", "error");
        }
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "pomodoro-config.json");
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

    const addCommand = () => {
        setSettings({
            ...settings,
            commands: [...settings.commands, { trigger: '!pom', action: 'start' }]
        });
    };

    const updateCommand = (index: number, updates: Partial<PomodoroCommand>) => {
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

    const updatePhase = (index: number, updates: Partial<PomodoroPhase>) => {
        const newPhases = [...settings.phases];
        newPhases[index] = { ...newPhases[index], ...updates };
        setSettings({ ...settings, phases: newPhases });
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
                        <Clock className="text-purple-500" /> Pomodoro Settings
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 justify-center relative">

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

                    <div className="h-4 w-px bg-white/10 mx-1 hidden md:block"></div>

                    <div className="flex bg-neutral-900 rounded border border-white/10 overflow-hidden divide-x divide-white/10 shadow-sm transition-all hover:border-white/20">
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/overlay/pomodoro?channel=${session?.user?.name}`;
                                navigator.clipboard.writeText(url);
                                addToast("URL copied to clipboard!", "success");
                            }}
                            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white flex items-center gap-2 group transition-colors"
                        >
                            <Copy size={14} className="group-active:scale-95 transition-transform" /> Copy URL
                        </button>
                        <a
                            href={`/overlay/pomodoro?channel=${session?.user?.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs text-purple-400 font-medium hover:text-purple-300 flex items-center gap-2 group border-l border-white/10 transition-colors"
                        >
                            <ExternalLink size={14} className="group-active:scale-95 transition-transform" /> Open
                        </a>
                    </div>

                    <div className="flex items-center gap-3 border-l border-white/10 pl-3 ml-1">
                        <div className="flex items-center gap-2">
                            <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-purple-500" />
                            <span className="hidden sm:inline text-sm font-medium">{session.user?.name}</span>
                        </div>
                        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-gray-400 hover:text-white transition-colors" title="Sign Out">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* SETTINGS PANEL */}
                <div className="lg:col-span-3 bg-neutral-900 rounded-xl border border-white/5 overflow-hidden flex flex-col h-[75vh] transition-all duration-300">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5 bg-neutral-900/50">
                        <button onClick={() => setActiveTab("control")} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider flex justify-center items-center gap-2 transition-all ${activeTab === "control" ? "bg-white/5 text-purple-400 border-b-2 border-purple-500" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"}`}>
                            <Activity size={14} /> Control
                        </button>
                        <button onClick={() => setActiveTab("appearance")} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider flex justify-center items-center gap-2 transition-all ${activeTab === "appearance" ? "bg-white/5 text-purple-400 border-b-2 border-purple-500" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"}`}>
                            <Palette size={14} /> Style
                        </button>
                        <button onClick={() => setActiveTab("layout")} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-wider flex justify-center items-center gap-2 transition-all ${activeTab === "layout" ? "bg-white/5 text-purple-400 border-b-2 border-purple-500" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"}`}>
                            <Layout size={14} /> Layout
                        </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        {/* CONTROL TAB */}
                        {activeTab === "control" && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* General Status */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900 shadow-xl">
                                    <div className="p-4 bg-neutral-800/30 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-neutral-800 text-gray-500'}`}>
                                                <Settings size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold">General Status</h3>
                                                <p className="text-[10px] text-gray-500">Enable or disable the widget globally</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                                            className={`w-12 h-6 rounded-full transition-all relative ${settings.enabled ? 'bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-neutral-800 border border-white/5'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md`} style={{ left: settings.enabled ? '26px' : '4px' }} />
                                        </button>
                                    </div>
                                </div>

                                {/* Timer Controls */}
                                <div className="border border-white/5 rounded-xl overflow-hidden bg-neutral-900 shadow-2xl">
                                    <div className="p-4 bg-neutral-800/30 border-b border-white/5 flex items-center gap-3">
                                        <Activity size={18} className="text-purple-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Live Controls</h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_cmd', { detail: { action: 'start' } }))}
                                                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all active:scale-95"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-hover:shadow-green-500/20 transition-all">
                                                    <Play size={24} className="text-white ml-1" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tighter text-green-400">Start / Resume</span>
                                            </button>

                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_cmd', { detail: { action: 'pause' } }))}
                                                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all active:scale-95"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg group-hover:shadow-yellow-500/20 transition-all">
                                                    <Pause size={24} className="text-white" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tighter text-yellow-400">Pause Timer</span>
                                            </button>

                                            <button
                                                onClick={() => window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_cmd', { detail: { action: 'reset' } }))}
                                                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-hover:shadow-red-500/20 transition-all">
                                                    <Square size={24} className="text-white" />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tighter text-red-400">Stop & Reset</span>
                                            </button>
                                        </div>

                                        <div className="mt-6 flex flex-col gap-3">
                                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Quick Jump to Phase</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {settings.phases.slice(0, 4).map((phase, idx) => (
                                                    <button
                                                        key={phase.id}
                                                        onClick={() => window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_cmd', { detail: { action: 'jump', value: idx.toString() } }))}
                                                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-white/5 transition-all active:scale-95 group"
                                                    >
                                                        <div className={`p-1.5 rounded bg-neutral-900 group-hover:bg-neutral-800 transition-colors ${phase.type === 'work' ? 'text-purple-400' :
                                                            phase.type === 'break' ? 'text-cyan-400' : 'text-amber-400'
                                                            }`}>
                                                            {phase.type === 'work' ? <Brain size={14} /> :
                                                                phase.type === 'break' ? <Coffee size={14} /> : <Sparkles size={14} />}
                                                        </div>
                                                        <span className="text-[8px] font-bold uppercase truncate w-full text-center">{phase.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Timer Phases - Refactored */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('timers')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Timer Phases
                                        {openSections.timers ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.timers && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] text-gray-500 italic">Configure your 4 main phases</p>
                                            </div>
                                            <div className="space-y-3">
                                                {settings.phases.slice(0, 4).map((phase, idx) => (
                                                    <div key={phase.id} className="flex flex-col gap-2 bg-neutral-800 p-3 rounded-xl border border-white/5 group relative">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1.5 rounded-lg ${phase.type === 'work' ? 'bg-purple-500/10 text-purple-400' :
                                                                phase.type === 'break' ? 'bg-cyan-500/10 text-cyan-400' :
                                                                    'bg-amber-500/10 text-amber-400'}`}>
                                                                {phase.type === 'work' ? <Brain size={14} /> :
                                                                    phase.type === 'break' ? <Coffee size={14} /> :
                                                                        <Sparkles size={14} />}
                                                            </div>
                                                            {idx < 3 ? (
                                                                <span className="px-2 py-1 text-xs font-bold w-full text-white">
                                                                    {phase.name}
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    value={phase.name}
                                                                    onChange={(e) => updatePhase(idx, { name: e.target.value })}
                                                                    className="bg-neutral-900 border border-white/5 rounded px-2 py-1 text-xs font-bold w-full focus:border-purple-500 focus:outline-none"
                                                                    placeholder="Phase Name"
                                                                />
                                                            )}
                                                            <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest px-1">
                                                                Slot {idx + 1}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 flex items-center gap-3">
                                                                <input
                                                                    type="range"
                                                                    min="1"
                                                                    max="120"
                                                                    value={phase.duration}
                                                                    onChange={(e) => updatePhase(idx, { duration: parseInt(e.target.value) })}
                                                                    className={`flex-1 accent-purple-500 h-1`}
                                                                />
                                                                <span className="text-[10px] font-mono text-gray-400 w-8">{phase.duration}m</span>
                                                            </div>
                                                            <div className="text-[10px] font-bold text-gray-500 px-2 py-1 bg-neutral-900 border border-white/10 rounded">
                                                                {phase.type.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Commands Section - Moved from behavior */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('commands')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Chat Commands
                                        {openSections.commands ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.commands && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] text-gray-500 italic">Configure triggers for bot control</p>
                                                <button onClick={addCommand} className="flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300">
                                                    <Plus size={12} /> Add Command
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {settings.commands.map((cmd, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-neutral-800 p-2 rounded-lg border border-white/5 group">
                                                        <input
                                                            value={cmd.trigger}
                                                            onChange={(e) => updateCommand(idx, { trigger: e.target.value })}
                                                            className="bg-neutral-900 border border-white/5 rounded px-2 py-1 text-xs w-24 focus:border-purple-500 focus:outline-none"
                                                        />
                                                        <ArrowRight size={12} className="text-gray-600" />
                                                        <select
                                                            value={cmd.action}
                                                            onChange={(e) => updateCommand(idx, { action: e.target.value as any })}
                                                            className="bg-neutral-900 border border-white/5 rounded px-2 py-1 text-xs flex-1 focus:border-purple-500 focus:outline-none"
                                                        >
                                                            <option value="start">Start / Resume</option>
                                                            <option value="pause">Pause</option>
                                                            <option value="reset">Stop & Reset</option>
                                                            <option value="skip">Skip Session</option>
                                                        </select>
                                                        <button onClick={() => removeCommand(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Audio Tab - Moved to Control as it is behaviorial */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('audio')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Audio & Alerts
                                        {openSections.audio ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.audio && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-2 p-2 bg-neutral-800/50 rounded-lg border border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-300">End Notification Sound</span>
                                                        <button onClick={() => setSettings({ ...settings, endSoundEnabled: !settings.endSoundEnabled })} className={`w-9 h-4.5 rounded-full transition-all relative ${settings.endSoundEnabled ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-neutral-700'}`}>
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all`} style={{ left: settings.endSoundEnabled ? '20px' : '2px' }} />
                                                        </button>
                                                    </div>
                                                    {settings.endSoundEnabled && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="p-1.5 bg-neutral-900 rounded border border-white/5 flex-1 flex items-center gap-2">
                                                                <Music size={12} className="text-gray-500 shrink-0" />
                                                                <input
                                                                    type="text"
                                                                    value={settings.endSoundUrl}
                                                                    onChange={(e) => setSettings({ ...settings, endSoundUrl: e.target.value })}
                                                                    placeholder="MP3 URL"
                                                                    className="bg-transparent border-none text-[10px] w-full focus:outline-none text-gray-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 p-2 bg-neutral-800/50 rounded-lg border border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-gray-300">Ambient Music Loop</span>
                                                        <button onClick={() => setSettings({ ...settings, ambientMusicEnabled: !settings.ambientMusicEnabled })} className={`w-9 h-4.5 rounded-full transition-all relative ${settings.ambientMusicEnabled ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-neutral-700'}`}>
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all`} style={{ left: settings.ambientMusicEnabled ? '20px' : '2px' }} />
                                                        </button>
                                                    </div>
                                                    {settings.ambientMusicEnabled && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="p-1.5 bg-neutral-900 rounded border border-white/5 flex-1 flex items-center gap-2">
                                                                <Music size={12} className="text-gray-500 shrink-0" />
                                                                <input
                                                                    type="text"
                                                                    value={settings.ambientMusicUrl}
                                                                    onChange={(e) => setSettings({ ...settings, ambientMusicUrl: e.target.value })}
                                                                    placeholder="MP3 URL"
                                                                    className="bg-transparent border-none text-[10px] w-full focus:outline-none text-gray-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Master Volume ({Math.round(settings.volume * 100)}%)</label>
                                                <input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })} className="w-full accent-purple-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE TAB */}
                        {activeTab === "appearance" && (
                            <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                                {/* Theme & Colors */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('theme')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Theme & Colors
                                        {openSections.theme ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.theme && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Primary Accent</label>
                                                    <div className="flex gap-2 p-1.5 bg-neutral-800 rounded-lg border border-white/5">
                                                        <input type="color" value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} className="w-8 h-8 rounded shrink-0 bg-transparent cursor-pointer border-none" />
                                                        <input type="text" value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Background Color</label>
                                                    <div className="flex gap-2 p-1.5 bg-neutral-800 rounded-lg border border-white/5">
                                                        <input type="color" value={settings.backgroundColor} onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })} className="w-8 h-8 rounded shrink-0 bg-transparent cursor-pointer border-none" />
                                                        <input type="text" value={settings.backgroundColor} onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })} className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Text & Icon Color</label>
                                                    <div className="flex gap-2 p-1.5 bg-neutral-800 rounded-lg border border-white/5">
                                                        <input type="color" value={settings.textColor} onChange={(e) => setSettings({ ...settings, textColor: e.target.value })} className="w-8 h-8 rounded shrink-0 bg-transparent cursor-pointer border-none" />
                                                        <input type="text" value={settings.textColor} onChange={(e) => setSettings({ ...settings, textColor: e.target.value })} className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Background Image URL</label>
                                                    <div className="flex gap-2 p-1.5 bg-neutral-800 rounded-lg border border-white/5">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-900 border border-white/5 text-gray-500">
                                                            <ImageIcon size={14} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={settings.backgroundImageUrl}
                                                            onChange={(e) => setSettings({ ...settings, backgroundImageUrl: e.target.value })}
                                                            placeholder="https://..."
                                                            className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Global Opacity ({Math.round(settings.opacity * 100)}%)</label>
                                                    <input type="range" min="0.1" max="1" step="0.05" value={settings.opacity} onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Background Opacity ({Math.round(settings.backgroundOpacity * 100)}%)</label>
                                                    <input type="range" min="0" max="1" step="0.05" value={settings.backgroundOpacity} onChange={(e) => setSettings({ ...settings, backgroundOpacity: parseFloat(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-white/5">
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-bold block">Glassmorphism</span>
                                                    <span className="text-[10px] text-gray-500 block">Frosted blur effect</span>
                                                </div>
                                                <button onClick={() => setSettings({ ...settings, glassmorphism: !settings.glassmorphism })} className={`w-9 h-4.5 rounded-full transition-all relative ${settings.glassmorphism ? 'bg-purple-600' : 'bg-neutral-700'}`}>
                                                    <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all`} style={{ left: settings.glassmorphism ? '20px' : '2px' }} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Typography */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('typography')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Typography & Scale
                                        {openSections.typography ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.typography && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Font Family</label>
                                                <select value={settings.fontFamily} onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })} className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 transition-all">
                                                    <option value="Inter, sans-serif">Inter (Modern)</option>
                                                    <option value="'JetBrains Mono', monospace">JetBrains Mono (Coding)</option>
                                                    <option value="'Outfit', sans-serif">Outfit (Premium)</option>
                                                    <option value="'Montserrat', sans-serif">Montserrat (Bold)</option>
                                                    <option value="'Bebas Neue', cursive">Bebas Neue (Impact)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Global Scale ({settings.scale}x)</label>
                                                <input type="range" min="0.5" max="2" step="0.1" value={settings.scale} onChange={(e) => setSettings({ ...settings, scale: parseFloat(e.target.value) })} className="w-full accent-purple-500" />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Text Align</label>
                                                <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-800 rounded-lg border border-white/5">
                                                    {['left', 'center', 'right'].map((align) => (
                                                        <button
                                                            key={align}
                                                            onClick={() => setSettings({ ...settings, textAlign: align as any })}
                                                            className={`py-1.5 rounded text-[10px] uppercase font-bold transition-all ${settings.textAlign === align ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                                        >
                                                            {align}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* LAYOUT TAB */}
                        {activeTab === "layout" && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                {/* Screen Position */}
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
                                                {["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"].map((pos, i) => (
                                                    <button
                                                        key={pos}
                                                        onClick={() => setSettings({ ...settings, position: pos as any })}
                                                        className={`aspect-square rounded border transition-all ${settings.position === pos ? "bg-purple-600 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-neutral-700 border-neutral-600 hover:bg-neutral-600"}`}
                                                        title={pos}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-center text-gray-500">Click a square to anchor the widget.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Dimensions */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('dimensions')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Dimensions
                                        {openSections.dimensions ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.dimensions && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Width ({settings.width}px)</label>
                                                    <input type="range" min="150" max="600" step="10" value={settings.width} onChange={(e) => setSettings({ ...settings, width: parseInt(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Height ({settings.height}px)</label>
                                                    <input type="range" min="60" max="300" step="5" value={settings.height} onChange={(e) => setSettings({ ...settings, height: parseInt(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>
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
                                                <select value={settings.animationEntry} onChange={(e) => setSettings({ ...settings, animationEntry: e.target.value as any })} className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 transition-all">
                                                    <option value="fade">Fade In</option>
                                                    <option value="slide-up">Slide Up</option>
                                                    <option value="slide-left">Slide Left</option>
                                                    <option value="scale">Scale Up</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-400">Exit Effect</label>
                                                <select value={settings.animationExit} onChange={(e) => setSettings({ ...settings, animationExit: e.target.value as any })} className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 transition-all">
                                                    <option value="fade">Fade Out</option>
                                                    <option value="slide-down">Slide Down</option>
                                                    <option value="slide-right">Slide Right</option>
                                                    <option value="scale">Scale Down</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Spacing */}
                                <div className="border border-white/5 rounded-lg overflow-hidden bg-neutral-900">
                                    <button
                                        onClick={() => toggleSection('spacing')}
                                        className="w-full flex justify-between items-center p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                    >
                                        Spacing
                                        {openSections.spacing ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </button>
                                    {openSections.spacing && (
                                        <div className="p-4 border-t border-white/5 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Inner Padding ({settings.padding}px)</label>
                                                    <input type="range" min="0" max="60" value={settings.padding} onChange={(e) => setSettings({ ...settings, padding: parseInt(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-400">Screen Margin ({settings.margin}px)</label>
                                                    <input type="range" min="0" max="100" value={settings.margin} onChange={(e) => setSettings({ ...settings, margin: parseInt(e.target.value) })} className="w-full accent-purple-500" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-neutral-900 border-t border-white/10 space-y-3">
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={`w-full py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2 shadow-lg ${hasUnsavedChanges
                                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-[0.98]"
                                : "bg-neutral-800 text-gray-500 cursor-not-allowed border border-white/5"
                                }`}
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>{isSaving ? <CheckCircle size={18} /> : <Save size={18} />} {hasUnsavedChanges ? "Save Changes" : "No Changes to Save"}</>
                            )}
                        </button>

                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`w-full py-2 rounded-lg text-xs font-medium border transition-colors flex justify-center items-center gap-2 ${showPreview ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-gray-400 hover:bg-white/5"}`}
                        >
                            {showPreview ? "Hide Preview" : "Show Preview in Dashboard"}
                        </button>
                    </div>
                </div>

                {/* PREVIEW PANEL */}
                {showPreview && (
                    <div className="lg:col-span-2 bg-neutral-900 rounded-xl border border-white/5 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Activity size={18} className="text-purple-400" /> Live Preview
                            </h2>
                            <span className="text-xs text-gray-500">Live preview reflects your unsaved changes</span>
                        </div>

                        {/* The preview container represents the viewport (screen) */}
                        <div className="flex-1 rounded-lg bg-[url('https://files.catbox.moe/3b5u4d.jpg')] bg-cover bg-center relative overflow-hidden shadow-2xl min-h-[500px] border border-white/10">
                            <div className="absolute inset-0 bg-black/40"></div>
                            {/* We wrap PomodoroWidget in a container that simulates the screen */}
                            <div className="absolute inset-0 pointer-events-none">
                                <PomodoroWidget settingsOverride={settings} />
                            </div>
                        </div>
                        <p className="text-xs text-center text-gray-600 mt-2">Background image is for preview purposes only.</p>
                    </div>
                )}
            </div>

            {/* Toasts Container */}
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
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div >
    );
}
