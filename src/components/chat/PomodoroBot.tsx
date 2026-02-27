"use client";

import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { useSession } from "next-auth/react";
import { DEFAULT_POMODORO_SETTINGS, PomodoroSettings, PomodoroSessionType } from "@/utils/pomodoro";

interface PomodoroState {
    status: 'idle' | 'running' | 'paused';
    currentPhaseIndex: number;
    endTime: number | null;
    timeLeft: number; // in seconds
    lastFinished: number; // timestamp pulse
}

const DEFAULT_STATE: PomodoroState = {
    status: 'idle',
    currentPhaseIndex: 0,
    endTime: null,
    timeLeft: DEFAULT_POMODORO_SETTINGS.phases[0].duration * 60,
    lastFinished: 0,
};

export default function PomodoroBot() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
    const settingsRef = useRef<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
    const clientRef = useRef<tmi.Client | null>(null);
    const stateRef = useRef<PomodoroState>(DEFAULT_STATE);

    const loadSettings = () => {
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

                const updated = { ...DEFAULT_POMODORO_SETTINGS, ...parsed };
                setSettings(updated);
                settingsRef.current = updated;
            } catch (e) {
                console.error("[PomodoroBot] Error parsing settings", e);
            }
        }
    };

    const loadState = () => {
        const saved = localStorage.getItem('ponicstream_pomodoro_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Basic validation/migration for state
                if (parsed.currentPhaseIndex === undefined && parsed.sessionCount !== undefined) {
                    // Reset to start if coming from old state to avoid index errors
                    parsed.currentPhaseIndex = 0;
                    parsed.timeLeft = settingsRef.current.phases[0].duration * 60;
                }
                stateRef.current = { ...DEFAULT_STATE, ...parsed };
            } catch (e) {
                console.error("[PomodoroBot] Error parsing state", e);
            }
        }
    };

    const saveState = () => {
        localStorage.setItem('ponicstream_pomodoro_state', JSON.stringify(stateRef.current));
        window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_state_update', { detail: stateRef.current }));
    };

    const nextSession = () => {
        const state = stateRef.current;
        const s = settingsRef.current;

        state.currentPhaseIndex = (state.currentPhaseIndex + 1) % s.phases.length;
        state.timeLeft = s.phases[state.currentPhaseIndex].duration * 60;
        state.status = 'idle';
        state.endTime = null;
    };

    const handleAction = (action: string, value?: string) => {
        const state = stateRef.current;
        const s = settingsRef.current;

        switch (action) {
            case 'start':
                if (state.status !== 'running') {
                    state.status = 'running';
                    state.endTime = Date.now() + (state.timeLeft * 1000);
                }
                break;
            case 'pause':
                if (state.status === 'running') {
                    state.status = 'paused';
                    state.timeLeft = Math.max(0, Math.round((state.endTime! - Date.now()) / 1000));
                    state.endTime = null;
                }
                break;
            case 'reset':
                state.status = 'idle';
                state.timeLeft = s.phases[state.currentPhaseIndex].duration * 60;
                state.endTime = null;
                break;
            case 'skip':
                nextSession();
                break;
            case 'jump':
                if (value !== undefined) {
                    const idx = parseInt(value);
                    if (!isNaN(idx) && idx >= 0 && idx < s.phases.length) {
                        state.currentPhaseIndex = idx;
                        state.timeLeft = s.phases[idx].duration * 60;
                        state.status = 'idle';
                        state.endTime = null;
                    }
                }
                break;
            case 'set':
                if (value) {
                    const mins = parseInt(value);
                    if (!isNaN(mins)) {
                        state.timeLeft = mins * 60;
                        if (state.status === 'running') {
                            state.endTime = Date.now() + (state.timeLeft * 1000);
                        }
                    }
                }
                break;
        }
        saveState();
    };

    // Keep action handler fresh for event listeners
    const handleActionRef = useRef(handleAction);
    handleActionRef.current = handleAction;

    useEffect(() => {
        loadSettings();
        loadState();

        const handleUpdate = () => loadSettings();
        const handleCmd = (e: any) => {
            if (e.detail?.action) {
                handleActionRef.current(e.detail.action, e.detail.value);
            }
        };

        window.addEventListener('ponicstream_pomodoro_update', handleUpdate);
        window.addEventListener('ponicstream_pomodoro_cmd', handleCmd);

        return () => {
            window.removeEventListener('ponicstream_pomodoro_update', handleUpdate);
            window.removeEventListener('ponicstream_pomodoro_cmd', handleCmd);
        };
    }, []);

    // Handle Twitch Chat Commands
    useEffect(() => {
        if (!session?.user?.name || !settings.commandsEnabled) return;

        const client = new tmi.Client({
            channels: [session.user.name]
        });

        client.connect().catch(console.error);
        clientRef.current = client;

        client.on("message", (channel, tags, message, self) => {
            if (self) return;

            const isPrivileged = tags.mod || tags.badges?.broadcaster === '1' || tags.badges?.supermod === '1' || tags.badges?.['super-mod'] === '1';
            if (!isPrivileged) return;

            const trimmedMessage = message.trim().toLowerCase();
            const command = settings.commands.find(c => trimmedMessage.startsWith(c.trigger.toLowerCase()));

            if (command) {
                handleActionRef.current(command.action, trimmedMessage.split(' ')[1]);
            }
        });

        return () => {
            client.disconnect();
            clientRef.current = null;
        };
    }, [session, settings.commandsEnabled, settings.commands]);

    // Timer Ticker Logic
    useEffect(() => {
        const tick = () => {
            const state = stateRef.current;
            if (state.status === 'running' && state.endTime) {
                const now = Date.now();
                if (now >= state.endTime) {
                    state.timeLeft = 0;
                    state.status = 'idle';
                    state.endTime = null;
                    state.lastFinished = Date.now();
                    window.dispatchEvent(new CustomEvent('ponicstream_pomodoro_finish'));
                    nextSession();
                    saveState();
                }
            }
        };

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []); // No dependencies needed anymore since we use Refs

    return null;
}
