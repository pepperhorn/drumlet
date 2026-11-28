import { DrumletPlayer } from './DrumletPlayer.js';

interface EmbedPageProps {
  code: string;
  theme: 'light' | 'dark';
}

export default function EmbedPage({ code, theme }: EmbedPageProps) {
  return (
    <DrumletPlayer
      groove={{ share: code }}
      chrome="full"
      theme={theme}
      className="drumlet-embed-page min-h-dvh content-start bg-bg p-2 md:p-3"
    />
  );
}
