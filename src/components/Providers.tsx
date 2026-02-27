"use client";

import { SessionProvider } from "next-auth/react";
import TranslationBot from "./chat/TranslationBot";
import PomodoroBot from "./chat/PomodoroBot";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <TranslationBot />
            <PomodoroBot />
        </SessionProvider>
    );
}
