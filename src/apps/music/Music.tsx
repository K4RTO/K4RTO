"use client";

import type { AppComponentProps } from "@/apps/registry";
import { useWindowManager } from "@/contexts/WindowManagerContext";

// Replace with your Spotify playlist/album/artist ID
const DEFAULT_PLAYLIST_ID = "1koxgvj1npSj4a97JY91Y2";

export default function Music({ windowId }: AppComponentProps) {
  const { state } = useWindowManager();
  const windowMeta = state.windows.get(windowId)?.meta as Record<string, string> | undefined;
  const playlistId = windowMeta?.playlistId ?? DEFAULT_PLAYLIST_ID;

  const embedUrl =
    `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;

  return (
    <div className="flex flex-col w-full h-full bg-black overflow-hidden">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ display: "block", border: "none" }}
      />
    </div>
  );
}
