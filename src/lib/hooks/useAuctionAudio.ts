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

type TrackId =
  | 'ambient:no-auction'
  | 'ambient:lobby-early'
  | 'ambient:lobby-late'
  | 'countdown:intro'
  | 'auction:loop'
  | 'end:win'
  | 'end:lose'
  | 'end:failed';

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

const TRACKS: Record<TrackId, TrackConfig> = {
  'ambient:no-auction': {
    file: `${AUDIO_BASE}antarctique-ambiance.mp3`,
    loop: true,
    label: 'ANTARCTIQUE AMBIANCE',
  },
  'ambient:lobby-early': {
    file: `${AUDIO_BASE}incubation-station.mp3`,
    loop: true,
    label: 'INCUBATION STATION',
  },
  'ambient:lobby-late': {
    file: `${AUDIO_BASE}sultry-poultry.mp3`,
    loop: true,
    label: 'SULTRY POULTRY',
  },
  'countdown:intro': {
    file: `${AUDIO_BASE}auction-intro.mp3`,
    loop: false,
    label: 'AUCTION COUNTDOWN',
  },
  'auction:loop': {
    file: `${AUDIO_BASE}auction-live-bg-loop.mp3`,
    loop: true,
    label: 'FOWL PLAY',
  },
  'end:win': {
    file: `${AUDIO_BASE}auction-win.mp3`,
    loop: false,
    label: 'VICTORY',
  },
  'end:lose': {
    file: `${AUDIO_BASE}auction-lost.mp3`,
    loop: false,
    label: 'DEFEAT',
  },
  'end:failed': {
    file: `${AUDIO_BASE}auction-failed.mp3`,
    loop: false,
    label: 'NO WINNER',
  },
};

const COUNTDOWN_DURATION_MS = 35425;

// Global state - blessed audio elements
let audioContext: AudioContext | null = null;
let musicPlayer: HTMLAudioElement | null = null;
let voicePlayer: HTMLAudioElement | null = null;
let isUnlocked = false;

export function useAuctionAudio() {
  const currentTrackRef = useRef<TrackId | null>(null);
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef<AudioMode>('silent');
  const pendingModeRef = useRef<AudioMode | null>(null);

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

  const stopMusic = useCallback(() => {
    if (musicPlayer) {
      musicPlayer.pause();
      musicPlayer.currentTime = 0;
    }
    currentTrackRef.current = null;
    setNowPlaying(null);
  }, []);

  const playTrack = useCallback((id: TrackId) => {
    if (!isUnlocked || !musicPlayer) {
      console.warn('⚠️ Audio not ready');
      return;
    }

    const config = TRACKS[id];
    if (!config) return;

    // Already playing this track
    if (currentTrackRef.current === id && !musicPlayer.paused) {
      return;
    }

    console.log(`🎵 Playing: ${config.label}`);

    // Stop current
    musicPlayer.pause();

    // Switch source and play
    musicPlayer.src = config.file;
    musicPlayer.loop = config.loop;
    musicPlayer.volume = musicVolumeRef.current * 0.7;
    musicPlayer.currentTime = 0;
    currentTrackRef.current = id;
    setNowPlaying({ name: config.label, artist: 'ADMIN' });

    musicPlayer.play().catch((err) => {
      console.error(`❌ Music play failed:`, err);
    });
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  const applyMode = useCallback(
    (mode: AudioMode) => {
      console.log('🎚️ Mode:', mode);
      modeRef.current = mode;
      clearCountdown();

      if (mode === 'silent') {
        stopMusic();
        return;
      }

      const modeToTrack: Record<string, TrackId> = {
        'ambient-no-auction': 'ambient:no-auction',
        'ambient-lobby-early': 'ambient:lobby-early',
        'ambient-lobby-late': 'ambient:lobby-late',
        countdown: 'countdown:intro',
        auction: 'auction:loop',
      };

      const trackId = modeToTrack[mode];
      if (!trackId) return;

      if (mode === 'countdown') {
        playTrack('countdown:intro');
        countdownTimeoutRef.current = setTimeout(() => {
          countdownTimeoutRef.current = null;
          modeRef.current = 'auction';
          playTrack('auction:loop');
        }, COUNTDOWN_DURATION_MS);
      } else {
        playTrack(trackId);
      }
    },
    [playTrack, stopMusic, clearCountdown]
  );

  const setAudioMode = useCallback(
    (mode: AudioMode) => {
      if (modeRef.current === mode && !pendingModeRef.current) return;

      if (!isUnlocked) {
        console.log('🔒 Queuing mode:', mode);
        pendingModeRef.current = mode;
        return;
      }

      pendingModeRef.current = null;
      applyMode(mode);
    },
    [applyMode]
  );

  /**
   * MUST be called from user click/tap.
   * Creates and unlocks both music and voice players.
   */
  const unlockAudio = useCallback(() => {
    if (isUnlocked) {
      console.log('🔊 Already unlocked');
      if (pendingModeRef.current) {
        applyMode(pendingModeRef.current);
        pendingModeRef.current = null;
      }
      return;
    }

    console.log('🔓 Unlocking audio...');

    try {
      // Create AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Play a silent oscillator to fully unlock
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);

      // Create the music player
      if (!musicPlayer) {
        musicPlayer = new Audio();
        musicPlayer.crossOrigin = 'anonymous';
        musicPlayer.preload = 'auto';
      }

      // Create the voice player (separate element for voices)
      if (!voicePlayer) {
        voicePlayer = new Audio();
        voicePlayer.crossOrigin = 'anonymous';
        voicePlayer.preload = 'auto';
      }

      isUnlocked = true;
      console.log('✅ Audio unlocked (music + voice players ready)');

      // Apply pending mode
      if (pendingModeRef.current) {
        const mode = pendingModeRef.current;
        pendingModeRef.current = null;
        setTimeout(() => applyMode(mode), 100);
      }
    } catch (err) {
      console.error('❌ Unlock error:', err);
      // Try to proceed anyway
      if (!musicPlayer) {
        musicPlayer = new Audio();
        musicPlayer.crossOrigin = 'anonymous';
      }
      if (!voicePlayer) {
        voicePlayer = new Audio();
        voicePlayer.crossOrigin = 'anonymous';
      }
      isUnlocked = true;
    }
  }, [applyMode]);

  const playVoice = useCallback(
    (clip: VoiceClip, src: string) => {
      if (voicesPlayed.has(clip)) return;
      if (!isUnlocked || !voicePlayer) {
        console.warn('⚠️ Voice player not ready');
        return;
      }

      console.log(`🗣️ Playing voice: ${clip}`);

      // Stop current voice
      voicePlayer.pause();
      voicePlayer.currentTime = 0;

      // Set up the new voice
      voicePlayer.src = src;
      voicePlayer.volume = voiceVolumeRef.current;
      voicePlayer.loop = false;

      // Clear previous event listeners
      voicePlayer.onended = () => {
        setActiveVoice(null);
      };

      setActiveVoice(clip);

      voicePlayer
        .play()
        .then(() => {
          setVoicesPlayed((prev) => new Set(prev).add(clip));
        })
        .catch((err) => {
          console.error(`❌ Voice play failed:`, err);
          setActiveVoice(null);
        });
    },
    [voicesPlayed]
  );

  const resetVoices = useCallback(() => {
    setVoicesPlayed(new Set());
  }, []);

  const playEndMusic = useCallback(
    (outcome: 'win' | 'lose' | 'failed') => {
      clearCountdown();
      stopMusic();
      modeRef.current = 'silent';

      // Stop voice
      if (voicePlayer) {
        voicePlayer.pause();
        voicePlayer.currentTime = 0;
      }
      setActiveVoice(null);

      if (!isUnlocked || !musicPlayer) return;

      const trackMap: Record<string, TrackId> = {
        win: 'end:win',
        lose: 'end:lose',
        failed: 'end:failed',
      };

      playTrack(trackMap[outcome]);
    },
    [stopMusic, clearCountdown, playTrack]
  );

  const setMasterMusicVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setMusicVolume(clamped);
    musicVolumeRef.current = clamped;
    if (musicPlayer && !musicPlayer.paused) {
      musicPlayer.volume = clamped * 0.7;
    }
  }, []);

  const setMasterVoiceVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVoiceVolume(clamped);
    voiceVolumeRef.current = clamped;
    if (voicePlayer && !voicePlayer.paused) {
      voicePlayer.volume = clamped;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCountdown();
      stopMusic();
      if (voicePlayer) {
        voicePlayer.pause();
        voicePlayer.currentTime = 0;
      }
    };
  }, [stopMusic, clearCountdown]);

  return {
    setAudioMode,
    unlockAudio,
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
