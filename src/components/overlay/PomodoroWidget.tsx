"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_POMODORO_SETTINGS, PomodoroSettings, PomodoroSessionType } from "@/utils/pomodoro";
import { Clock, Coffee, Brain, Bell, Sparkles } from "lucide-react";

interface PomodoroState {
    status: 'idle' | 'running' | 'paused';
    currentPhaseIndex: number;
    endTime: number | null;
    timeLeft: number;
    lastFinished?: number;
}

export default function PomodoroWidget({ settingsOverride }: { settingsOverride?: PomodoroSettings }) {
    const [settings, setSettings] = useState<PomodoroSettings>(settingsOverride || DEFAULT_POMODORO_SETTINGS);
    const [state, setState] = useState<PomodoroState>({
        status: 'idle',
        currentPhaseIndex: 0,
        endTime: null,
        timeLeft: DEFAULT_POMODORO_SETTINGS.phases[0].duration * 60,
    });

    const [displayTime, setDisplayTime] = useState(DEFAULT_POMODORO_SETTINGS.phases[0].duration * 60);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedFinishRef = useRef<number>(0);

    // Sync Settings & State
    useEffect(() => {
        if (settingsOverride) {
            setSettings(settingsOverride);
            return;
        }

        const load = () => {
            const savedSettings = localStorage.getItem('ponicstream_pomodoro_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Migration check
                if (!parsed.phases) {
                    const defaultPhases = DEFAULT_POMODORO_SETTINGS.phases;
                    setSettings({ ...DEFAULT_POMODORO_SETTINGS, ...parsed, phases: defaultPhases });
                } else {
                    setSettings({ ...DEFAULT_POMODORO_SETTINGS, ...parsed });
                }
            }

            const savedState = localStorage.getItem('ponicstream_pomodoro_state');
            if (savedState) setState(JSON.parse(savedState));
        };

        load();

        const handleUpdate = () => load();
        window.addEventListener('ponicstream_pomodoro_update', handleUpdate);
        window.addEventListener('ponicstream_pomodoro_state_update', (e: any) => setState(e.detail));
        window.addEventListener('storage', (e) => {
            if (e.key === 'ponicstream_pomodoro_state' || e.key === 'ponicstream_pomodoro_settings') load();
        });

        return () => {
            window.removeEventListener('ponicstream_pomodoro_update', handleUpdate);
        };
    }, [settingsOverride]);

    // Initialize finish ref
    useEffect(() => {
        if (state.lastFinished) {
            lastPlayedFinishRef.current = state.lastFinished;
        }
    }, []);

    // Timer Update Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (state.status === 'running' && state.endTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.round((state.endTime! - now) / 1000));
                setDisplayTime(remaining);

                if (remaining === 0) {
                    clearInterval(interval);
                }
            }, 100);
        } else {
            setDisplayTime(state.timeLeft);
        }

        return () => clearInterval(interval);
    }, [state.status, state.endTime, state.timeLeft]);

    // Audio Logic
    useEffect(() => {
        if (state.status === 'running' && settings.ambientMusicEnabled && settings.ambientMusicUrl) {
            // If URL changed or music not created, create new
            if (!musicRef.current || musicRef.current.src !== settings.ambientMusicUrl) {
                musicRef.current?.pause();
                musicRef.current = new Audio(settings.ambientMusicUrl);
                musicRef.current.loop = true;
            }
            musicRef.current.volume = settings.volume;
            musicRef.current.play().catch(console.error);
        } else {
            musicRef.current?.pause();
            // Optional: reset it if disabled
            if (!settings.ambientMusicEnabled) {
                musicRef.current = null;
            }
        }

        return () => {
            if (state.status !== 'running' || !settings.ambientMusicEnabled) {
                musicRef.current?.pause();
            }
        };
    }, [state.status, settings.ambientMusicEnabled, settings.ambientMusicUrl, settings.volume]);

    useEffect(() => {
        const handleFinish = () => {
            if (settings.endSoundEnabled && settings.endSoundUrl) {
                const alarm = new Audio(settings.endSoundUrl);
                alarm.volume = settings.volume;
                alarm.play().catch(console.error);
            }
        };

        // Watch state Finish trigger (for cross-window sync)
        if (state.lastFinished && state.lastFinished > lastPlayedFinishRef.current) {
            lastPlayedFinishRef.current = state.lastFinished;
            handleFinish();
        }

        window.addEventListener('ponicstream_pomodoro_finish', handleFinish);
        return () => window.removeEventListener('ponicstream_pomodoro_finish', handleFinish);
    }, [settings.endSoundEnabled, settings.endSoundUrl, settings.volume, state.lastFinished]);



    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getIcon = () => {
        const phase = settings.phases[state.currentPhaseIndex] || settings.phases[0];
        if (phase.type === 'work') return <Brain className="text-purple-400" size={18} />;
        if (phase.type === 'break') return <Coffee className="text-cyan-400" size={18} />;
        return <Sparkles className="text-amber-400" size={18} />;
    };

    const getLabel = () => {
        const phase = settings.phases[state.currentPhaseIndex] || settings.phases[0];
        return phase.name;
    };

    const getPositionStyle = () => {
        const margin = settings.margin;
        switch (settings.position) {
            case 'top-left': return { top: margin, left: margin };
            case 'top-center': return { top: margin, left: '50%', transform: `translateX(-50%)` };
            case 'top-right': return { top: margin, right: margin };
            case 'center-left': return { top: '50%', left: margin, transform: `translateY(-50%)` };
            case 'center': return { top: '50%', left: '50%', transform: `translate(-50%, -50%)` };
            case 'center-right': return { top: '50%', right: margin, transform: `translateY(-50%)` };
            case 'bottom-left': return { bottom: margin, left: margin };
            case 'bottom-center': return { bottom: margin, left: '50%', transform: `translateX(-50%)` };
            case 'bottom-right': return { bottom: margin, right: margin };
            default: return { top: margin, right: margin };
        }
    };

    const getTransformOrigin = () => {
        const [y, x] = settings.position.split('-');
        if (!x) return 'center center'; // 'center' case
        return `${y} ${x}`;
    };

    const animationVariants = {
        fade: {
            initial: { opacity: 0 },
            animate: { opacity: settings.opacity },
            exit: { opacity: 0 }
        },
        'slide-up': {
            initial: { opacity: 0, y: 40 },
            animate: { opacity: settings.opacity, y: 0 },
            exit: { opacity: 0, y: 40 }
        },
        'slide-left': {
            initial: { opacity: 0, x: 40 },
            animate: { opacity: settings.opacity, x: 0 },
            exit: { opacity: 0, x: 40 }
        },
        scale: {
            initial: { opacity: 0, scale: 0.8 },
            animate: { opacity: settings.opacity, scale: 1 },
            exit: { opacity: 0, scale: 0.8 }
        },
        'slide-down': {
            initial: { opacity: 0, y: -40 },
            animate: { opacity: settings.opacity, y: 0 },
            exit: { opacity: 0, y: -40 }
        },
        'slide-right': {
            initial: { opacity: 0, x: -40 },
            animate: { opacity: settings.opacity, x: 0 },
            exit: { opacity: 0, x: -40 }
        }
    };

    const textStyle = { color: settings.textColor };
    const mutedTextStyle = { color: `${settings.textColor}${'99'}` }; // ~60% opacity
    const dimTextStyle = { color: `${settings.textColor}${'4d'}` }; // ~30% opacity

    const entryEffect = settings.animationEntry || 'fade';
    const exitEffect = settings.animationExit || 'fade';

    const entryStyle = (animationVariants as any)[entryEffect] || animationVariants.fade;
    const exitStyle = (animationVariants as any)[exitEffect] || animationVariants.fade;

    return (
        <AnimatePresence>
            {(settings.enabled || !!settingsOverride) && (
                <div
                    key="pomodoro-widget"
                    className={`${settingsOverride ? 'absolute' : 'fixed'} z-50 transition-all duration-300`}
                    style={{
                        ...getPositionStyle(),
                        scale: settings.scale,
                        transformOrigin: getTransformOrigin()
                    }}
                >
                    <motion.div
                        initial={entryStyle.initial}
                        animate={entryStyle.animate}
                        exit={exitStyle.exit}
                        className={`
                            relative rounded-2xl border border-white/10 shadow-2xl overflow-hidden
                            ${settings.glassmorphism ? 'backdrop-blur-xl' : ''}
                        `}
                        style={{
                            width: settings.width,
                            height: settings.height,
                            color: settings.textColor
                        }}
                    >
                        {/* Background Layer */}
                        <div
                            className="absolute inset-0 z-0"
                            style={{
                                backgroundColor: settings.backgroundColor,
                                backgroundImage: settings.backgroundImageUrl ? `url(${settings.backgroundImageUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                opacity: settings.backgroundOpacity
                            }}
                        />

                        {/* Content Layer (Foreground) */}
                        <div className="relative z-10 flex items-center gap-4 w-full h-full" style={{ padding: settings.padding }}>
                            {/* Progress Bar Background */}
                            <div className="absolute bottom-0 left-0 h-1 w-full" style={{ backgroundColor: `${settings.textColor}${'1a'}` }} />
                            <motion.div
                                className="absolute bottom-0 left-0 h-1"
                                style={{ backgroundColor: settings.themeColor }}
                                initial={{ width: '0%' }}
                                animate={{ width: `${(1 - displayTime / (state.timeLeft || 1)) * 100}%` }}
                            />

                            <div className="flex flex-col flex-1" style={{ textAlign: settings.textAlign }}>
                                <div className={`flex items-center gap-2 mb-1 ${settings.textAlign === 'center' ? 'justify-center' : settings.textAlign === 'right' ? 'justify-end' : ''}`}>
                                    {getIcon()}
                                    <span className="text-[10px] font-bold uppercase tracking-widest" style={mutedTextStyle}>
                                        {getLabel()}
                                    </span>
                                    {state.status === 'paused' && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded animate-pulse" style={{ backgroundColor: `${settings.textColor}${'1a'}`, color: settings.textColor }}>PAUSED</span>
                                    )}
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tabular-nums tracking-tighter" style={{ ...textStyle, color: settings.themeColor, fontFamily: settings.fontFamily }}>
                                        {formatTime(displayTime)}
                                    </span>
                                    <span className="text-xs font-bold" style={dimTextStyle}>
                                        #{state.currentPhaseIndex + 1}
                                    </span>
                                </div>
                            </div>

                            {/* Status Indicator Circle */}
                            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" style={{ color: `${settings.textColor}${'0d'}` }} />
                                    <motion.circle
                                        cx="24" cy="24" r="20" stroke={settings.themeColor} strokeWidth="3" fill="transparent"
                                        strokeDasharray="125.6"
                                        initial={{ strokeDashoffset: 125.6 }}
                                        animate={{ strokeDashoffset: 125.6 - (125.6 * (displayTime / ((settings.phases[state.currentPhaseIndex]?.duration || 1) * 60))) }}
                                    />
                                </svg>
                                <div className="absolute">
                                    {state.status === 'running' ? <Clock size={14} className="animate-spin-slow" style={mutedTextStyle} /> : <Bell size={14} style={dimTextStyle} />}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <style jsx>{`
                        @keyframes spin-slow {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        .animate-spin-slow {
                            animation: spin-slow 8s linear infinite;
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>
    );
}
