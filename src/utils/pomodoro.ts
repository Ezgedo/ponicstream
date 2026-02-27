export type PomodoroSessionType = 'work' | 'break' | 'custom';

export interface PomodoroPhase {
    id: string;
    name: string;
    duration: number; // in minutes
    type: PomodoroSessionType;
}

export interface PomodoroCommand {
    trigger: string;
    action: 'start' | 'pause' | 'reset' | 'skip' | 'set';
}

export interface PomodoroSettings {
    enabled: boolean;

    // Dynamic Phasing
    phases: PomodoroPhase[];

    // Visuals
    position: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    themeColor: string;
    backgroundColor: string;
    backgroundImageUrl: string;
    textColor: string;
    opacity: number;
    backgroundOpacity: number;
    scale: number;
    width: number;
    height: number;
    padding: number;
    margin: number;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    animationEntry: 'fade' | 'slide-up' | 'slide-left' | 'scale';
    animationExit: 'fade' | 'slide-down' | 'slide-right' | 'scale';
    showTimerOnActivate: boolean;
    glassmorphism: boolean;

    // Audio
    endSoundEnabled: boolean;
    endSoundUrl: string; // Base64 or external URL
    ambientMusicEnabled: boolean;
    ambientMusicUrl: string;
    volume: number;

    // Commands
    commandsEnabled: boolean;
    commands: PomodoroCommand[];
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
    enabled: false,
    phases: [
        { id: '1', name: 'Focus', duration: 25, type: 'work' },
        { id: '2', name: 'Short Focus', duration: 15, type: 'work' },
        { id: '3', name: 'Break', duration: 5, type: 'break' },
        { id: '4', name: 'Custom Name', duration: 10, type: 'custom' },
    ],

    position: 'top-right',
    themeColor: '#a855f7', // Purple-500
    backgroundColor: '#000000',
    backgroundImageUrl: '',
    textColor: '#ffffff',
    opacity: 0.9,
    backgroundOpacity: 0.8,
    scale: 1,
    width: 280,
    height: 100,
    padding: 16,
    margin: 24,
    fontFamily: 'Inter',
    textAlign: 'left',
    animationEntry: 'fade',
    animationExit: 'fade',
    showTimerOnActivate: true,
    glassmorphism: true,

    endSoundEnabled: true,
    endSoundUrl: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bbd154da62.mp3', // Simple digital alarm
    ambientMusicEnabled: false,
    ambientMusicUrl: 'https://cdn.pixabay.com/audio/2022/05/27/audio_180873748b.mp3', // Lo-fi chill beat
    volume: 0.5,

    commandsEnabled: true,
    commands: [
        { trigger: '!pomstart', action: 'start' },
        { trigger: '!pompause', action: 'pause' },
        { trigger: '!pomreset', action: 'reset' },
        { trigger: '!pomskip', action: 'skip' },
    ],
};
