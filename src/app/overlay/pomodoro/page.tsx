"use client";

import PomodoroWidget from "@/components/overlay/PomodoroWidget";
import PomodoroBot from "@/components/chat/PomodoroBot";

export default function PomodoroOverlayPage() {
    return (
        <div className="min-h-screen bg-transparent overflow-hidden">
            <PomodoroBot />
            <PomodoroWidget />
        </div>
    );
}
