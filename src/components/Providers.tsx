"use client";

import { SessionProvider } from "next-auth/react";
import TranslationBot from "./chat/TranslationBot";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <TranslationBot />
        </SessionProvider>
    );
}
