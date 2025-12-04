import { useCallback, useEffect, useRef, useState } from 'react';

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

type AudioTrackId =
  | 'ambient:no-auction'
  | 'ambient:lobby-early'
  | 'ambient:lobby-late'
  | 'countdown:intro'
  | 'auction:loop';

export type AudioMode =
  | 'silent'
  | 'ambient-no-auction'
  | 'ambient-lobby-early'
  | 'ambient-lobby-late'
  | 'countdown'
  | 'auction';

type TrackConfig = {
  file: string;
  loop: boolean;
  label: string;
};

const AUDIO_BASE =
  'https://idzzbnumpmqozrfnokbv.supabase.co/storage/v1/object/public/audio/';

const trackUrl = (file: string) => `${AUDIO_BASE}${file}`;

const TRACKS: Record<AudioTrackId, TrackConfig> = {
  'ambient:no-auction': {
    file: trackUrl('antarctique-ambiance.mp3'),
    loop: true,
    label: 'ANTARCTIQUE AMBIANCE',
  },
  'ambient:lobby-early': {
    file: trackUrl('incubation-station.mp3'),
    loop: true,
    label: 'INCUBATION STATION',
  },
  'ambient:lobby-late': {
    file: trackUrl('sultry-poultry.mp3'),
    loop: true,
    label: 'SULTRY POULTRY',
  },
  'countdown:intro': {
    file: trackUrl('auction-intro.mp3'),
    loop: false,
    label: 'AUCTION COUNTDOWN',
  },
  'auction:loop': {
    file: trackUrl('auction-live-bg-loop.mp3'),
    loop: true,
    label: 'FOWL PLAY',
  },
};

const COUNTDOWN_DURATION_MS = 35425;

export function useAuctionAudio() {
  const trackRefs = useRef<Map<AudioTrackId, HTMLAudioElement>>(new Map());
  const currentTrackRef = useRef<AudioTrackId | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef<AudioMode>('silent');

  const [nowPlaying, setNowPlaying] = useState<{
    name: string;
    artist: string;
  } | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [voiceVolume, setVoiceVolume] = useState(0.5);
  const [activeVoice, setActiveVoice] = useState<VoiceClip | null>(null);
  const [voicesPlayed, setVoicesPlayed] = useState<Set<VoiceClip>>(new Set());

  const musicVolumeRef = useRef(0.5);
  const voiceVolumeRef = useRef(0.5);
  const activeVoicesRef = useRef<HTMLAudioElement[]>([]);

  const ensureTrack = useCallback((id: AudioTrackId) => {
    if (!trackRefs.current.has(id)) {
      const config = TRACKS[id];
      const audio = new Audio(config.file);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.loop = config.loop;
      audio.volume = musicVolumeRef.current * 0.7;
      trackRefs.current.set(id, audio);
    }
    return trackRefs.current.get(id)!;
  }, []);

  const stopCurrentTrack = useCallback(() => {
    if (currentTrackRef.current) {
      const current = trackRefs.current.get(currentTrackRef.current);
      if (current) {
        current.pause();
        current.currentTime = 0;
      }
      currentTrackRef.current = null;
    }
    setNowPlaying(null);
  }, []);

  const playTrack = useCallback(
    async (id: AudioTrackId) => {
      const config = TRACKS[id];
      if (!config) return;

      if (currentTrackRef.current === id) {
        const existing = trackRefs.current.get(id);
        if (existing && !existing.paused) {
          setNowPlaying({ name: config.label, artist: 'ADMIN' });
          return;
        }
      }

      stopCurrentTrack();
      const audio = ensureTrack(id);
      audio.loop = config.loop;
      audio.volume = musicVolumeRef.current * 0.7;
      audio.currentTime = 0;
      currentTrackRef.current = id;
      setNowPlaying({ name: config.label, artist: 'ADMIN' });

      try {
        await audio.play();
      } catch (err) {
        console.error(`❌ Failed to play ${config.label}:`, err);
      }
    },
    [ensureTrack, stopCurrentTrack]
  );

  const clearCountdown = () => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  };

  const setAudioMode = useCallback(
    (mode: AudioMode) => {
      if (modeRef.current === mode) return;
      console.log('🎚️ Audio mode:', modeRef.current, '→', mode);
      modeRef.current = mode;
      clearCountdown();

      if (mode === 'silent') {
        stopCurrentTrack();
        return;
      }

      if (mode === 'ambient-no-auction') {
        playTrack('ambient:no-auction');
      } else if (mode === 'ambient-lobby-early') {
        playTrack('ambient:lobby-early');
      } else if (mode === 'ambient-lobby-late') {
        playTrack('ambient:lobby-late');
      } else if (mode === 'countdown') {
        playTrack('countdown:intro');
        countdownTimeoutRef.current = setTimeout(() => {
          countdownTimeoutRef.current = null;
          modeRef.current = 'auction';
          playTrack('auction:loop');
        }, COUNTDOWN_DURATION_MS);
      } else if (mode === 'auction') {
        playTrack('auction:loop');
      }
    },
    [playTrack, stopCurrentTrack]
  );

  const preloadAllTracks = useCallback(async () => {
    const ids = Object.keys(TRACKS) as AudioTrackId[];
    await Promise.all(
      ids.map(async (id) => {
        const audio = ensureTrack(id);
        try {
          audio.volume = 0;
          await audio.play();
        } catch {
          // Ignore autoplay rejection
        } finally {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = musicVolumeRef.current * 0.7;
        }
      })
    );
  }, [ensureTrack]);

  const playVoice = useCallback(
    (clip: VoiceClip, src: string) => {
      if (voicesPlayed.has(clip)) return;

      activeVoicesRef.current.forEach((voice) => {
        voice.pause();
        voice.currentTime = 0;
      });
      activeVoicesRef.current = [];

      const voice = new Audio(src);
      voice.crossOrigin = 'anonymous';
      voice.preload = 'auto';
      voice.volume = voiceVolumeRef.current;
      activeVoicesRef.current.push(voice);
      setActiveVoice(clip);

      voice.addEventListener('ended', () => {
        activeVoicesRef.current = activeVoicesRef.current.filter(
          (v) => v !== voice
        );
        setActiveVoice((current) => (current === clip ? null : current));
      });

      voice
        .play()
        .then(() => {
          setVoicesPlayed((prev) => new Set(prev).add(clip));
        })
        .catch((err) => console.error(`Voice ${clip} play failed:`, err));
    },
    [voicesPlayed]
  );

  const resetVoices = useCallback(() => {
    setVoicesPlayed(new Set());
  }, []);

  const playEndMusic = useCallback(
    (outcome: 'win' | 'lose' | 'failed') => {
      clearCountdown();
      stopCurrentTrack();
      modeRef.current = 'silent';

      activeVoicesRef.current.forEach((voice) => {
        voice.pause();
        voice.currentTime = 0;
      });
      activeVoicesRef.current = [];
      setActiveVoice(null);

      const map = {
        win: trackUrl('auction-win.mp3'),
        lose: trackUrl('auction-lost.mp3'),
        failed: trackUrl('auction-failed.mp3'),
      };

      const audio = new Audio(map[outcome]);
      audio.volume = musicVolumeRef.current;
      audio.play().catch((err) => console.error('End music failed:', err));
    },
    [stopCurrentTrack]
  );

  const setMasterMusicVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setMusicVolume(clamped);
    musicVolumeRef.current = clamped;
    trackRefs.current.forEach((audio) => {
      audio.volume = clamped * 0.7;
    });
  }, []);

  const setMasterVoiceVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVoiceVolume(clamped);
    voiceVolumeRef.current = clamped;
  }, []);

  useEffect(
    () => () => {
      clearCountdown();
      stopCurrentTrack();
      activeVoicesRef.current.forEach((voice) => {
        voice.pause();
        voice.currentTime = 0;
      });
      activeVoicesRef.current = [];
    },
    [stopCurrentTrack]
  );

  return {
    setAudioMode,
    preloadAllTracks,
    playVoice,
    resetVoices,
    playEndMusic,
    setMasterMusicVolume,
    setMasterVoiceVolume,
    musicVolume,
    voiceVolume,
    activeVoice,
    voicesPlayed,
    nowPlaying,
  };
}
