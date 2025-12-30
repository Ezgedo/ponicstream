import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const channelName = searchParams.get('channel');

    if (!channelName) {
        return NextResponse.json({ error: 'Missing channel parameter' }, { status: 400 });
    }

    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    try {
        // 1. Get App Access Token (Client Credentials Flow)
        // Note: In a production app, you should cache this token.
        const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) throw new Error("Failed to get access token");

        const headers = {
            'Client-ID': process.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${accessToken}`
        };

        // 2. Get User ID from Username
        const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, { headers });
        const userData = await userRes.json();

        if (!userData.data || userData.data.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userId = userData.data[0].id;

        // 3. Fetch Global Badges
        const globalRes = await fetch('https://api.twitch.tv/helix/chat/badges/global', { headers });
        const globalData = await globalRes.json();

        // 4. Fetch Channel Badges
        const channelRes = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${userId}`, { headers });
        const channelData = await channelRes.json();

        // 5. Merge Badges
        const badgeMap: Record<string, Record<string, string>> = {};
        const merge = (data: any[]) => {
            if (!data) return;
            data.forEach((set: any) => {
                if (!badgeMap[set.set_id]) badgeMap[set.set_id] = {};
                set.versions.forEach((v: any) => {
                    badgeMap[set.set_id][v.id] = v.image_url_1x; // Using 1x for chat, could optionally use 2x/4x
                });
            });
        }

        merge(globalData.data);
        merge(channelData.data);

        return NextResponse.json(badgeMap);

    } catch (error) {
        console.error("API Badge Fetch Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
