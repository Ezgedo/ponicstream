"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, Layout, Settings, LogOut, ExternalLink, ArrowRight, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardHub() {
    const { data: session, status } = useSession();

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

    const modules = [
        {
            id: "chat",
            title: "Chat Configuration",
            description: "Customize your stream chat overlay. Backgrounds, animations, roles, and more.",
            icon: <MessageSquare size={32} className="text-purple-400" />,
            href: "/dashboard/chat",
            color: "border-purple-500/30 hover:border-purple-500",
            bg: "bg-purple-900/10 hover:bg-purple-900/20"
        },
        {
            id: "live",
            title: "Live Mod Chat (BETA)",
            description: "Interact with chat, ban/timeout users, and moderate your stream in real-time.",
            icon: <Shield size={32} className="text-pink-500" />,
            href: "/dashboard/live",
            color: "border-pink-500/30 hover:border-pink-500",
            bg: "bg-pink-900/10 hover:bg-pink-900/20"
        },
        // Future modules (Placeholders)
        {
            id: "alerts",
            title: "Stream Alerts (Coming Soon)",
            description: "Coming Soon. Configure custom alerts for followers, subs, and raids.",
            icon: <ActivityIcon size={32} className="text-gray-600" />,
            href: "#",
            color: "border-gray-800",
            bg: "bg-neutral-900/50 grayscale opacity-50 cursor-not-allowed"
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/10 pb-6 gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent">
                    PonicStream Hub
                </h1>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <img src={session.user?.image || ""} className="w-8 h-8 rounded-full border border-purple-500" />
                        <span className="hidden sm:inline text-sm font-medium text-white">{session.user?.name}</span>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1"></div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto">
                <p className="text-gray-400 mb-6 text-lg">Select a module to configure:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module) => (
                        <Link
                            key={module.id}
                            href={module.href}
                            className={`group p-6 rounded-2xl border ${module.color} ${module.bg} transition-all duration-300 backdrop-blur-sm flex flex-col gap-4 relative overflow-hidden`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-neutral-950/50 rounded-xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
                                    {module.icon}
                                </div>
                                {module.href !== "#" && <ArrowRight className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />}
                            </div>

                            <div>
                                <h2 className="text-xl font-bold mb-2 text-white group-hover:text-purple-300 transition-colors">{module.title}</h2>
                                <p className="text-sm text-gray-400 leading-relaxed">{module.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ActivityIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
