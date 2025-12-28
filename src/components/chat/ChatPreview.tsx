"use client";

import { useState, useEffect } from "react";
import ChatBox, { ChatStyles, ChatMessageData } from "./ChatBox";

interface ChatPreviewProps {
    styles: ChatStyles;
    messages: ChatMessageData[];
}

export default function ChatPreview({ styles, messages }: ChatPreviewProps) {
    return (
        <div className="w-full h-full bg-gray-900/50 rounded-lg overflow-hidden border border-white/10 relative checker-bg">
            {/* Background checker pattern to show transparency if needed */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
            </div>

            <ChatBox styles={styles} messages={messages} />
        </div>
    );
}
