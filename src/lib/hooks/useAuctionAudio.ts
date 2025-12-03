import { useEffect, useRef, useState } from 'react';

type VoiceClip =
  | 'my-loot'
  | 'why-bother'
  | 'backup'
  | 'evac'
  | 'hands-off'
  | 'cant-hold-them'
  | 'finale'
  | 'player-down'
  | 'cant-do-this'
  | 'pathetic'
  | 'one-last-try';

type AmbientTrack = {
  name: string;
  artist: string;
  file: string;
};

const AMBIENT_TRACKS: Record<string, AmbientTrack> = {
  'no-auction': {
    name: 'ANTARCTIQUE AMBIANCE',
    artist: 'ADMIN',
    file: '/assets/audio/antarctique-ambiance.mp3',
  },
  'lobby-closed': {
    name: 'INCUBATION STATION',
    artist: 'ADMIN',
    file: '/assets/audio/incubation-station.mp3',
  },
  'lobby-open': {
    name: 'SULTRY POULTRY',
    artist: 'ADMIN',
    file: '/assets/audio/sultry-poultry.mp3',
  },
  auction: {
    name: 'FOWL PLAY',
    artist: 'ADMIN',
    file: '/assets/audio/auction-live-bg-loop.mp3',
  },
};

export function useAuctionAudio() {
  const introRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null); // For ambient music
  const activeVoicesRef = useRef<HTMLAudioElement[]>([]); // Track active voice clips
  const musicVolumeRef = useRef(0.5); // Music volume
  const voiceVolumeRef = useRef(0.5); // Voice volume
  const [isPlaying, setIsPlaying] = useState(false);
  const [voicesPlayed, setVoicesPlayed] = useState<Set<VoiceClip>>(new Set());
  const [musicVolume, setMusicVolume] = useState(0.5); // 0-1
  const [voiceVolume, setVoiceVolume] = useState(0.5); // 0-1
  const [activeVoice, setActiveVoice] = useState<VoiceClip | null>(null); // Currently playing voice
  const [nowPlaying, setNowPlaying] = useState<AmbientTrack | null>(null); // Current track info

  // Start auction sequence: intro → background loop
  const startMusic = () => {
    if (introRef.current || bgMusicRef.current) return; // Already playing

    // Stop ambient music first
    stopAmbient();

    // Play intro first
    const intro = new Audio('/assets/audio/auction-intro.mp3');
    intro.volume = musicVolumeRef.current * 0.7;
    introRef.current = intro;

    intro
      .play()
      .then(() => {
        setIsPlaying(true);
        setNowPlaying(AMBIENT_TRACKS.auction);

        // After exactly 35.425 seconds, start the loop
        setTimeout(() => {
          const bgLoop = new Audio('/assets/audio/auction-live-bg-loop.mp3');
          bgLoop.loop = true;
          // Use musicVolumeRef to get current volume (not closure)
          bgLoop.volume = musicVolumeRef.current * 0.7;
          bgMusicRef.current = bgLoop;

          bgLoop.play().catch((err) => console.error('BG loop failed:', err));
        }, 35425); // 35 seconds and 425 milliseconds
      })
      .catch((err) => console.error('Intro play failed:', err));
  };

  // Stop all music
  const stopMusic = () => {
    if (introRef.current) {
      introRef.current.pause();
      introRef.current = null;
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current = null;
    }
    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current = null;
    }
    setIsPlaying(false);
    setNowPlaying(null);
  };

  // Play ambient music (loops)
  const playAmbient = (
    trackKey: 'no-auction' | 'lobby-closed' | 'lobby-open'
  ) => {
    const track = AMBIENT_TRACKS[trackKey];
    if (!track) return;

    // Don't restart if already playing this track
    if (ambientRef.current && nowPlaying?.name === track.name) return;

    // Stop any existing ambient music
    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current = null;
    }

    // Stop auction music if playing
    if (introRef.current) {
      introRef.current.pause();
      introRef.current = null;
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current = null;
    }

    // Start new ambient track
    const ambient = new Audio(track.file);
    ambient.loop = true;
    ambient.volume = musicVolumeRef.current * 0.6; // Slightly quieter
    ambientRef.current = ambient;

    ambient
      .play()
      .then(() => {
        setIsPlaying(true);
        setNowPlaying(track);
      })
      .catch((err) => console.error('Ambient play failed:', err));
  };

  // Stop ambient music only
  const stopAmbient = () => {
    if (ambientRef.current) {
      ambientRef.current.pause();
      ambientRef.current = null;
    }
    setNowPlaying(null);
  };

  // Play voice clip (one-shot)
  const playVoice = (clip: VoiceClip, src: string) => {
    // Don't play if already played
    if (voicesPlayed.has(clip)) return;

    // Stop any currently playing voices to prevent overlap
    activeVoicesRef.current.forEach((v) => {
      v.pause();
      v.currentTime = 0;
    });
    activeVoicesRef.current = [];

    const voice = new Audio(src);
    voice.volume = voiceVolumeRef.current;

    // Track active voice
    activeVoicesRef.current.push(voice);
    setActiveVoice(clip); // Show portrait

    // Remove from active list when it ends
    voice.addEventListener('ended', () => {
      const index = activeVoicesRef.current.indexOf(voice);
      if (index > -1) {
        activeVoicesRef.current.splice(index, 1);
      }
      // Only clear activeVoice if this is the current one
      setActiveVoice((current) => (current === clip ? null : current));
    });

    voice
      .play()
      .then(() => {
        setVoicesPlayed((prev) => new Set(prev).add(clip));
      })
      .catch((err) => console.error(`Voice ${clip} play failed:`, err));
  };

  // Reset voices (for new auction)
  const resetVoices = () => {
    setVoicesPlayed(new Set());
  };

  // Play end music (stop all audio first)
  const playEndMusic = (outcome: 'win' | 'lose' | 'failed') => {
    // Stop background music
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current = null;
    }
    if (introRef.current) {
      introRef.current.pause();
      introRef.current = null;
    }

    // Stop all active voice clips
    activeVoicesRef.current.forEach((voice) => {
      voice.pause();
      voice.currentTime = 0;
    });
    activeVoicesRef.current = [];

    // Clear active voice to hide portrait
    setActiveVoice(null);

    // Play appropriate end music
    const audioMap = {
      win: '/assets/audio/auction-win.mp3',
      lose: '/assets/audio/auction-lost.mp3',
      failed: '/assets/audio/auction-failed.mp3',
    };

    const endAudio = new Audio(audioMap[outcome]);
    endAudio.volume = musicVolumeRef.current;
    endAudio.play().catch((err) => console.error('End music failed:', err));

    setIsPlaying(false);
  };

  // Update music volume
  const setMasterMusicVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setMusicVolume(clampedVolume);
    musicVolumeRef.current = clampedVolume;
    if (introRef.current) {
      introRef.current.volume = clampedVolume * 0.7;
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = clampedVolume * 0.7;
    }
    if (ambientRef.current) {
      ambientRef.current.volume = clampedVolume * 0.6;
    }
  };

  // Update voice volume
  const setMasterVoiceVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVoiceVolume(clampedVolume);
    voiceVolumeRef.current = clampedVolume;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, []);

  return {
    startMusic,
    stopMusic,
    playAmbient,
    stopAmbient,
    playVoice,
    resetVoices,
    playEndMusic,
    setMasterMusicVolume,
    setMasterVoiceVolume,
    isPlaying,
    voicesPlayed,
    musicVolume,
    voiceVolume,
    activeVoice, // Currently playing voice for portrait display
    nowPlaying, // Current track info for display
  };
}
