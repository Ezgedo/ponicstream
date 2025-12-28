import Link from "next/link";
import { Twitch } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/30 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 text-center space-y-6 max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Twitch size={40} className="text-white" />
          </div>
        </div>

        <h1 className="text-6xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Ponic
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Stream
          </span>
        </h1>

        <p className="text-xl text-gray-400 font-light">
          Professional tools for next-generation streamers.
          Customize your chat overlay with our premium dashboard.
        </p>

        <div className="pt-8">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-purple-600 font-lg rounded-full hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 focus:ring-offset-gray-900"
          >
            Get Started
            <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
