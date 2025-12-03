'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/contexts/AppContext';
import { supabase } from '@/lib/supabase/client';
import { useAuctionAudio } from '@/lib/hooks/useAuctionAudio';
import styles from './page.module.css';
import AuctionEndModal from './components/AuctionEndModal';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import LootIntelModal from './components/LootIntelModal';
import ProfileModal from './components/ProfileModal';
import DevControls from './components/DevControls';
import BidLockModal from './components/BidLockModal';
import { SpectatorLockModal } from './components/SpectatorLockModal';
import InterstitialModal from './components/InterstitialModal';
import VolumeControl from './components/VolumeControl';
import LaunchCountdown from './components/LaunchCountdown';
import MobileSidebar from './components/MobileSidebar';
import CommsPortrait from './components/CommsPortrait';
import NowPlaying from './components/NowPlaying';
import AudioPermissionModal from './components/AudioPermissionModal';

const ONE_HOUR_MS = 60 * 60 * 1000;
const BID_LOCK_DURATION_MS = 60000; // 10 seconds for testing (change to 60000 for prod)

type TimeWindow = 'no-auction' | 'standby' | 'live';
// PlayerProfile and AuctionPlan types removed - now using types from AppContext/Supabase

const formatCountdown = (ms: number | null) => {
  if (ms == null) return '--:--:--';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatDropTime = (timestamp?: number) => {
  if (!timestamp) return 'TBA';
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LOCKDOWN_STANDBY_MS = 20 * 60 * 1000;

const MOCK_COUNTDOWN: Record<TimeWindow, number | null> = {
  standby: 2 * ONE_HOUR_MS,
  live: 0,
  'no-auction': null,
};

export default function Home() {
  // Get auth and user data from context
  const { user, player, credits, refreshCredits, refreshProfile } = useApp();
  // products and authLoading available when needed

  // Audio hook
  const {
    startMusic,
    playAmbient,
    stopAmbient,
    playVoice,
    resetVoices,
    playEndMusic,
    setMasterMusicVolume,
    setMasterVoiceVolume,
    musicVolume,
    voiceVolume,
    activeVoice,
    nowPlaying,
  } = useAuctionAudio();

  const [price, setPrice] = useState(0); // Server price (will be set from DB)
  const [displayPrice, setDisplayPrice] = useState(0); // Animated price for visuals
  const [blurDigit, setBlurDigit] = useState(0); // Fast blur digit (0-9)
  const [lockedIn, setLockedIn] = useState<number | null>(null);
  const [spectatorLock, setSpectatorLock] = useState<{
    price: number;
    expiresAt: string;
  } | null>(null); // When another player locks the auction
  const [isPressed, setIsPressed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [timeMultiplier, setTimeMultiplier] = useState(1); // Set to 60 to make 1 min = 1 sec
  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [auctionEndModalOpen, setAuctionEndModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showEmailConfirmed, setShowEmailConfirmed] = useState(false);
  const [lootIntelModalOpen, setLootIntelModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [bidLockModalOpen, setBidLockModalOpen] = useState(false);
  const [launchCountdownOpen, setLaunchCountdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [auctionMusicStarted, setAuctionMusicStarted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [shouldStartAmbient, setShouldStartAmbient] = useState(false);
  const [audioPermissionModalOpen, setAudioPermissionModalOpen] =
    useState(false);
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      type: 'win' | 'bid';
      item: string;
      price?: number;
      date: string;
    }>
  >([]);
  const [currentAuction, setCurrentAuction] = useState<{
    id: string;
    status: string;
    start_at: string;
    start_price: number;
    floor_price: number;
    current_price?: number | null;
    drop_rate?: number | null;
    product_id: string;
    winner_id?: string | null;
    winning_price?: number | null;
    locked_by?: string | null;
    lock_expires_at?: string | null;
    created_at: string;
    ended_at?: string | null;
    products?: {
      name: string;
      variant: string | null;
      condition: string;
      contents: string[];
      shipping_time: string;
      shipping_method: string;
      returns_policy: string;
    };
  } | null>(null);
  const currentAuctionRef = useRef(currentAuction);
  const [currentProduct, setCurrentProduct] = useState<{
    name: string;
    variant: string | null;
    condition: string;
    contents: string[];
    shipping_time: string;
    shipping_method: string;
    returns_policy: string;
  } | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);

    // Check if user has already made audio choice
    const hasChosenAudio = localStorage.getItem('cb_audio_permission');
    if (!hasChosenAudio) {
      setAudioPermissionModalOpen(true);
    } else if (hasChosenAudio === 'allowed') {
      setAudioEnabled(true);
    }
  }, []);

  // Block scroll when any modal or sidebar is open
  useEffect(() => {
    const isAnyModalOpen =
      auctionEndModalOpen ||
      registerModalOpen ||
      loginModalOpen ||
      lootIntelModalOpen ||
      profileModalOpen ||
      bidLockModalOpen ||
      launchCountdownOpen ||
      mobileSidebarOpen ||
      interstitialOpen ||
      audioPermissionModalOpen;

    if (isAnyModalOpen) {
      // Block scroll on multiple levels for cross-browser compatibility
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.top = `-${scrollY}px`;
      document.documentElement.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position
        document.documentElement.style.overflow = '';
        document.documentElement.style.position = '';
        document.documentElement.style.top = '';
        document.documentElement.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [
    auctionEndModalOpen,
    registerModalOpen,
    loginModalOpen,
    lootIntelModalOpen,
    profileModalOpen,
    bidLockModalOpen,
    launchCountdownOpen,
    mobileSidebarOpen,
    interstitialOpen,
    audioPermissionModalOpen,
  ]);

  // Fetch recent wins
  useEffect(() => {
    if (!user) {
      setRecentActivity([]);
      return;
    }

    const fetchActivity = async () => {
      // Get last 3 auction wins
      const { data: wins, error } = await supabase
        .from('auctions')
        .select(
          `
          id,
          winning_price,
          ended_at,
          products (
            name,
            variant
          )
        `
        )
        .eq('winner_id', user.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching win:', error);
        setRecentActivity([]);
        return;
      }

      if (wins && wins.length > 0) {
        const activity = wins.map((auction: any) => ({
          type: 'win' as const,
          item: `${auction.products?.name || 'Unknown Item'}${
            auction.products?.variant ? ` (${auction.products.variant})` : ''
          }`,
          price: auction.winning_price,
          date: new Date(auction.ended_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }));
        setRecentActivity(activity);
      } else {
        setRecentActivity([]);
      }
    };

    fetchActivity();
  }, [user]);

  // Track online presence
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user?.id || `anon-${Math.random()}`,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user as online
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: user?.id || null,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Handle URL params (Stripe return, email confirmation, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle Stripe payment return (new tab)
    if (params.get('payment') === 'success') {
      console.log('Payment successful - returned from Stripe');
      setTimeout(() => setToast('PAYMENT SUCCESSFUL - PROCESSING WIN'), 0);

      // Realtime will trigger the AuctionEndModal when webhook completes
      // Tell user to close the old tab or just wait
      setTimeout(() => {
        setToast('YOU WON! Check the other tab or wait for confirmation.');
      }, 2000);

      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle payment cancelled
    if (params.get('payment') === 'cancelled') {
      console.log('Payment cancelled');
      setToast('PAYMENT CANCELLED - TRY AGAIN');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle email confirmation
    if (params.get('confirmed') === 'true') {
      setLoginModalOpen(true);
      setShowEmailConfirmed(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch current or upcoming auction and subscribe to updates
  useEffect(() => {
    const fetchAuction = async () => {
      const { data: auction } = await supabase
        .from('auctions')
        .select('*, products(*)')
        .in('status', ['scheduled', 'live']) // Exclude completed auctions
        .order('start_at', { ascending: true })
        .limit(1)
        .single();

      if (auction) {
        setCurrentAuction(auction);
        currentAuctionRef.current = auction;
        setCurrentProduct(auction.products);

        // Fetch product images
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', auction.product_id)
          .order('position', { ascending: true });

        if (images) {
          setProductImages(images.map((img) => img.url));
        }
      }
    };

    fetchAuction();

    // Subscribe to auction updates via Realtime
    const channel = supabase
      .channel('auction-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
        },
        (payload) => {
          const updatedAuction = payload.new as Record<string, unknown>;
          console.log(
            'Auction updated - current_price:',
            updatedAuction.current_price,
            'payload:',
            payload
          );

          // Update current auction if it's the one we're watching
          if (
            currentAuctionRef.current &&
            updatedAuction.id === currentAuctionRef.current.id
          ) {
            setCurrentAuction((prev) => {
              const updated = prev ? { ...prev, ...updatedAuction } : prev;
              currentAuctionRef.current = updated;
              return updated;
            });

            // Show auction end modal when status changes to completed
            if (updatedAuction.status === 'completed') {
              setAuctionEndModalOpen(true);

              // Get current user ID from Supabase session (more reliable than context in callbacks)
              supabase.auth.getSession().then(({ data: { session } }) => {
                const currentUserId = session?.user?.id;

                // Play appropriate end music
                if (!updatedAuction.winner_id) {
                  playEndMusic('failed'); // No winner
                } else if (updatedAuction.winner_id === currentUserId) {
                  playEndMusic('win'); // You won!
                } else {
                  playEndMusic('lose'); // Someone else won
                }
              });

              // Close bid lock modal if open
              setBidLockModalOpen(false);
              setLockedIn(null);
              setLockExpiresAt(null);
              setCheckoutUrl(null);
            }

            // Handle auction locks
            console.log('Lock update check:', {
              locked_by: updatedAuction.locked_by,
              lock_expires_at: updatedAuction.lock_expires_at,
              current_price: updatedAuction.current_price,
            });

            if (updatedAuction.locked_by && updatedAuction.lock_expires_at) {
              // Check if it's locked by someone else
              supabase.auth.getSession().then(({ data: { session } }) => {
                const currentUserId = session?.user?.id;
                console.log('Lock comparison:', {
                  locked_by: updatedAuction.locked_by,
                  currentUserId,
                  isOtherPlayer: updatedAuction.locked_by !== currentUserId,
                });

                if (updatedAuction.locked_by !== currentUserId) {
                  // Another player locked it - show spectator modal
                  console.log('Showing spectator modal');
                  setSpectatorLock({
                    price: updatedAuction.current_price as number,
                    expiresAt: updatedAuction.lock_expires_at as string,
                  });
                }
              });
            } else if (!updatedAuction.locked_by) {
              // Lock released - close spectator modal
              console.log('Closing spectator modal - lock released');
              setSpectatorLock(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Only subscribe once on mount
  const isDevEnv = process.env.NODE_ENV !== 'production';
  const [devOverride, setDevOverride] = useState<TimeWindow | null>(null);
  const [devStandbyLockdown, setDevStandbyLockdown] = useState(false);

  const updateDevOverride = (next: TimeWindow | null) => {
    setDevOverride(next);
    if (next !== 'standby') {
      setDevStandbyLockdown(false);
    }
  };
  // Mock callsign generation removed - using real user data from context

  useEffect(() => {
    const startTime = Date.now();
    const realStartTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - realStartTime;
      setNow(startTime + elapsed * timeMultiplier);
    }, 100);

    return () => clearInterval(timer);
  }, [timeMultiplier]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  // Check for email confirmation success - open login modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      setTimeout(() => {
        setShowEmailConfirmed(true);
        setLoginModalOpen(true);
      }, 0);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const auctionStartTime = currentAuction?.start_at
    ? new Date(currentAuction.start_at).getTime()
    : null;

  const countdownMs = auctionStartTime
    ? Math.max(auctionStartTime - now, 0)
    : null;

  const derivedTimeWindow: TimeWindow = useMemo(() => {
    if (!currentAuction) return 'no-auction';
    if (currentAuction.status === 'live') return 'live';
    if (currentAuction.status === 'scheduled') return 'standby';
    return 'no-auction';
  }, [currentAuction]);

  const timeWindow: TimeWindow =
    isDevEnv && devOverride ? devOverride : derivedTimeWindow;

  const displayCountdownMs =
    isDevEnv && devOverride
      ? devOverride === 'standby'
        ? devStandbyLockdown
          ? LOCKDOWN_STANDBY_MS
          : MOCK_COUNTDOWN.standby
        : MOCK_COUNTDOWN[devOverride]
      : countdownMs;

  const countdownLabel =
    timeWindow === 'no-auction'
      ? 'Stand by'
      : formatCountdown(displayCountdownMs);

  const isWithinHour =
    timeWindow === 'standby' &&
    typeof displayCountdownMs === 'number' &&
    displayCountdownMs <= ONE_HOUR_MS;

  const isLockdown =
    timeWindow === 'standby' &&
    typeof displayCountdownMs === 'number' &&
    displayCountdownMs <= LOCKDOWN_STANDBY_MS;

  const isLoggedIn = Boolean(player);
  const hasCredit = credits > 0;
  const requiresCredit = isWithinHour || timeWindow === 'live';
  const isAuctionLive = timeWindow === 'live';

  // Listen to price updates via Realtime (Supabase Cron handles price drops)
  useEffect(() => {
    if (
      currentAuction?.current_price === undefined ||
      currentAuction?.current_price === null
    )
      return;
    setTimeout(() => {
      console.log(
        'Setting price from DB:',
        currentAuction.current_price,
        'floor:',
        currentAuction.floor_price
      );
      setPrice(currentAuction.current_price!);
      // If server price hits floor, snap display price immediately
      if (
        currentAuction.floor_price !== undefined &&
        currentAuction.current_price != null &&
        currentAuction.current_price <= currentAuction.floor_price
      ) {
        console.log(
          'Snapping displayPrice to floor:',
          currentAuction.floor_price
        );
        setDisplayPrice(currentAuction.floor_price);
      }
    }, 0);
  }, [currentAuction?.current_price, currentAuction?.floor_price]);

  // Animate price drops smoothly (visual flair - drops proportionally every 33ms)
  useEffect(() => {
    if (!isAuctionLive || lockedIn !== null || !currentAuction?.drop_rate)
      return;

    // Calculate visual drop per 33ms based on server's drop_rate
    // Server drops by drop_rate per second, so visual drop = drop_rate / 30
    const visualDropPer33ms = currentAuction.drop_rate / 30;
    const floorPrice = currentAuction.floor_price ?? 0;

    const animate = () => {
      setDisplayPrice((prev) => {
        // If we're behind the server price, catch up faster
        const gap = prev - price;
        if (gap > 3) {
          // If more than $3 behind, catch up aggressively (drop 20% of gap per tick)
          const next = Math.max(prev - gap * 0.2, floorPrice);
          return next;
        } else if (prev > price) {
          // Normal smooth drop
          const next = prev - visualDropPer33ms;
          const snappedPrice = next <= price ? price : next;
          return Math.max(snappedPrice, floorPrice);
        }
        return Math.max(price, floorPrice);
      });
    };

    const id = setInterval(animate, 33); // Visual tick every 33ms (~30fps)
    return () => clearInterval(id);
  }, [
    isAuctionLive,
    lockedIn,
    price,
    currentAuction?.drop_rate,
    currentAuction?.floor_price,
  ]);

  // Fast blur digit for visual effect (stop when at floor price and not moving)
  useEffect(() => {
    if (
      !isAuctionLive ||
      lockedIn !== null ||
      (currentAuction?.floor_price !== undefined &&
        displayPrice <= currentAuction.floor_price &&
        price <= currentAuction.floor_price)
    ) {
      // Set blur digit to 0 when stopped at floor
      if (
        currentAuction?.floor_price !== undefined &&
        displayPrice <= currentAuction.floor_price &&
        price <= currentAuction.floor_price
      ) {
        setBlurDigit(0);
      }
      return;
    }

    const animate = () => {
      setBlurDigit((prev) => (prev === 0 ? 9 : prev - 1)); // 9→8→...→0→9
    };

    const id = setInterval(animate, 8); // Super fast (8ms)
    return () => clearInterval(id);
  }, [
    isAuctionLive,
    lockedIn,
    displayPrice,
    price,
    currentAuction?.floor_price,
  ]);

  // Trigger ambient music when audio is first enabled
  useEffect(() => {
    if (audioEnabled && shouldStartAmbient) {
      setShouldStartAmbient(false);
      // Immediately start appropriate ambient music based on current state
      if (timeWindow === 'no-auction' && !auctionEndModalOpen) {
        playAmbient('no-auction');
      } else if (timeWindow === 'standby') {
        const startTime = currentAuction
          ? new Date(currentAuction.start_at).getTime()
          : null;
        const msUntilStart = startTime ? startTime - now : null;
        if (msUntilStart !== null && msUntilStart < ONE_HOUR_MS) {
          playAmbient('lobby-open');
        } else {
          playAmbient('lobby-closed');
        }
      }
    }
  }, [
    audioEnabled,
    shouldStartAmbient,
    timeWindow,
    auctionEndModalOpen,
    playAmbient,
    currentAuction,
    now,
  ]);

  // Play ambient music based on timeWindow
  useEffect(() => {
    // Don't play music until audio is enabled
    if (!audioEnabled) return;

    if (timeWindow === 'no-auction') {
      // Don't start ambient music if auction end modal is open
      if (!auctionEndModalOpen) {
        playAmbient('no-auction'); // antarctique-ambience
      }
      setAuctionMusicStarted(false); // Reset for next auction
    } else if (timeWindow === 'standby') {
      // Don't change music if countdown is about to start or is open
      if (launchCountdownOpen) {
        return;
      }

      // Check time until auction
      const startTime = currentAuction
        ? new Date(currentAuction.start_at).getTime()
        : null;
      const msUntilStart = startTime ? startTime - now : null;

      // < 60 mins: sultry-poultry, >= 60 mins: incubation-station
      if (msUntilStart !== null && msUntilStart < ONE_HOUR_MS) {
        playAmbient('lobby-open'); // sultry-poultry (< 60 mins)
      } else {
        playAmbient('lobby-closed'); // incubation-station (> 60 mins)
      }

      // Only reset if we're not in countdown (countdown sets this to true)
      if (!launchCountdownOpen) {
        setAuctionMusicStarted(false);
      }
    } else if (timeWindow === 'live' && !auctionMusicStarted) {
      // Auction is live but music hasn't started yet
      // This handles the case where user joins mid-auction or refreshes during live auction
      stopAmbient();
      startMusic();
      setAuctionMusicStarted(true);
    }
    // Note: When timeWindow is 'live' and auctionMusicStarted is true, do nothing (music continues)
  }, [
    timeWindow,
    now,
    currentAuction,
    playAmbient,
    stopAmbient,
    startMusic,
    launchCountdownOpen,
    auctionMusicStarted,
    auctionEndModalOpen,
    audioEnabled,
  ]);

  // Detect when auction is about to go live (within 35.14 seconds)
  useEffect(() => {
    if (!currentAuction || currentAuction.status !== 'scheduled') return;

    const startTime = new Date(currentAuction.start_at).getTime();
    const timeUntilStart = startTime - now;

    // If auction starts within 35.14 seconds, show countdown
    if (timeUntilStart > 0 && timeUntilStart <= 35140 && !launchCountdownOpen) {
      setLaunchCountdownOpen(true);
      if (audioEnabled) {
        stopAmbient(); // Stop ambient music before starting auction music
        startMusic(); // Start intro music
        setAuctionMusicStarted(true); // Mark that auction music has started
      }
    }
  }, [
    currentAuction,
    now,
    startMusic,
    stopAmbient,
    launchCountdownOpen,
    audioEnabled,
  ]);

  // When countdown completes, hide it
  const handleLaunchComplete = () => {
    setLaunchCountdownOpen(false);
    // Don't reset auctionMusicStarted - music should continue playing
  };

  // Trigger voice clips based on price remaining
  useEffect(() => {
    if (!isAuctionLive || !currentAuction || !price || !audioEnabled) return;

    const percentRemaining =
      ((price - currentAuction.floor_price) /
        (currentAuction.start_price - currentAuction.floor_price)) *
      100;

    if (percentRemaining > 98) {
      return;
    } else if (percentRemaining > 90) {
      playVoice('player-down', '/assets/audio/player-down.mp3');
    } else if (percentRemaining > 80) {
      playVoice('my-loot', '/assets/audio/my-loot.mp3');
    } else if (percentRemaining > 70) {
      playVoice('backup', '/assets/audio/backup.mp3');
    } else if (percentRemaining > 60) {
      playVoice('why-bother', '/assets/audio/why-bother.mp3');
    } else if (percentRemaining > 50) {
      playVoice('cant-hold-them', '/assets/audio/cant-hold-them.mp3');
    } else if (percentRemaining > 40) {
      playVoice('hands-off', '/assets/audio/hands-off.mp3');
    } else if (percentRemaining > 25) {
      playVoice('cant-do-this', '/assets/audio/cant-do-this.mp3');
    } else if (percentRemaining > 10) {
      playVoice('pathetic', '/assets/audio/pathetic.mp3');
    } else {
      // Triggers when percentage is 10% or lower
      playVoice('one-last-try', '/assets/audio/one-last-try.mp3');
    }
  }, [price, currentAuction, isAuctionLive, playVoice, audioEnabled]);

  // Reset voices when auction resets
  useEffect(() => {
    if (!isAuctionLive) {
      resetVoices();
    }
  }, [isAuctionLive, resetVoices]);

  useEffect(() => {
    if (isAuctionLive) return;
    const resetId = requestAnimationFrame(() => {
      const startPrice = currentAuction?.start_price || 0;
      setPrice(startPrice);
      setDisplayPrice(startPrice);
      setLockedIn(null);
    });
    return () => cancelAnimationFrame(resetId);
  }, [isAuctionLive, currentAuction]);

  // Removed - now using modal auth flow

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setToast('PLAYER SIGNED OUT');
  };

  const openInterstitial = () => {
    if (!isLoggedIn) {
      setToast('LOGIN REQUIRED');
      return;
    }
    setAdProgress(0);
    setInterstitialOpen(true);
  };

  const handleCancelBid = async () => {
    console.log('handleCancelBid called');
    if (!user || !currentAuction) return;

    // Unlock the auction
    await supabase
      .from('auctions')
      .update({
        locked_by: null,
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', currentAuction.id);

    // Mark bid as expired/cancelled
    await supabase
      .from('bids')
      .update({ status: 'expired' })
      .eq('auction_id', currentAuction.id)
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Reset UI
    console.log('Closing modal...');
    setBidLockModalOpen(false);
    setLockedIn(null);
    setCheckoutUrl(null);
    setLockExpiresAt(null);
    setToast('BID CANCELLED - AUCTION RESUMED');
  };

  useEffect(() => {
    if (!interstitialOpen) {
      const reset = setTimeout(() => setAdProgress(0), 0);
      return () => clearTimeout(reset);
    }

    const id = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(id);
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(id);
  }, [interstitialOpen]);

  const isAdComplete = adProgress >= 100;

  const grantCredit = async () => {
    if (!isAdComplete || !user) return;

    // Update credits in database
    const { error } = await supabase
      .from('credits')
      .update({ balance: 1, last_earned_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!error) {
      // Refresh credits from context
      await refreshCredits();
      setToast('CREDIT GRANTED. GOOD LUCK.');
    } else {
      setToast('ERROR GRANTING CREDIT');
    }

    setInterstitialOpen(false);
    setAdProgress(0);
  };

  const handleFire = async () => {
    if (!isAuctionLive) return;
    if (!isLoggedIn) {
      setToast('LOGIN REQUIRED');
      return;
    }
    if (requiresCredit && !hasCredit) {
      openInterstitial();
      return;
    }
    if (lockedIn !== null) return;

    setToast('LOCKING PRICE...');

    try {
      if (!user || !currentAuction) return;

      // 0. Fetch the ACTUAL current price from database (source of truth)
      const { data: freshAuction, error: fetchError } = await supabase
        .from('auctions')
        .select('current_price')
        .eq('id', currentAuction.id)
        .single();

      if (fetchError || !freshAuction?.current_price) {
        setToast('ERROR: Could not fetch current price');
        return;
      }

      const lockedPrice = freshAuction.current_price;
      setLockedIn(lockedPrice); // Set to DB price
      setDisplayPrice(lockedPrice); // Snap display to locked price immediately
      setPrice(lockedPrice); // Update server price state
      setToast('CREATING BID...');

      // 1. Create bid in database with ACTUAL price
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
          auction_id: currentAuction.id,
          user_id: user.id,
          bid_price: lockedPrice, // Use DB price, not animated price
          status: 'active',
          expires_at: new Date(Date.now() + 60000).toISOString(), // 60 seconds
        })
        .select()
        .single();

      if (bidError || !bid) {
        setToast(`BID FAILED: ${bidError?.message}`);
        setLockedIn(null);
        return;
      }

      // 2. Lock auction in database
      const expiryTime = new Date(
        Date.now() + BID_LOCK_DURATION_MS
      ).toISOString();

      const { error: lockError } = await supabase
        .from('auctions')
        .update({
          locked_by: user.id,
          locked_at: new Date().toISOString(),
          lock_expires_at: expiryTime,
        })
        .eq('id', currentAuction.id);

      if (lockError) {
        setToast(`LOCK FAILED: ${lockError.message}`);
        setLockedIn(null);
        return;
      }

      // Fetch the updated auction to get server timestamp
      const { data: updatedAuction } = await supabase
        .from('auctions')
        .select('lock_expires_at')
        .eq('id', currentAuction.id)
        .single();

      if (!updatedAuction?.lock_expires_at) {
        setToast('ERROR: Could not get lock time');
        setLockedIn(null);
        return;
      }

      // 3. Spend credit
      if (requiresCredit) {
        await supabase
          .from('credits')
          .update({ balance: 0, last_spent_at: new Date().toISOString() })
          .eq('user_id', user.id);
        await refreshCredits();
      }

      // 4. Create Stripe PaymentIntent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId: bid.id,
          price: lockedPrice, // Use the DB price
          userId: user.id,
          auctionId: currentAuction.id,
          productName: currentProduct?.name || 'Auction Win',
        }),
      });

      const { clientSecret, error: paymentError } = await response.json();

      if (paymentError || !clientSecret) {
        setToast(`PAYMENT SETUP FAILED: ${paymentError}`);
        setLockedIn(null);
        return;
      }

      // 5. Show lock modal with payment form (use DB timestamp as source of truth)
      const dbExpiryTimestamp = new Date(
        updatedAuction.lock_expires_at
      ).getTime();
      setCheckoutUrl(clientSecret); // Reuse this state for client secret
      setLockExpiresAt(dbExpiryTimestamp);
      setBidLockModalOpen(true);
      setToast('BID LOCKED - COMPLETE PAYMENT');
    } catch (err) {
      console.error('Fire button error:', err);
      setToast('ERROR: PLEASE TRY AGAIN');
      setLockedIn(null);
    }
  };

  const stageCopy = (() => {
    switch (timeWindow) {
      case 'no-auction':
        return {
          badge: 'SCANNING',
          headline: 'Awaiting signal',
          subline: 'No auction scheduled - Follow for intel',
          marquee:
            'NO TARGET • STAND BY FOR UPDATES • CHICKENBIDS NETWORK IDLE • NO UPLINK AVAILABLE',
          tickerTitle: 'STATUS',
          tickerStatus: 'SCANNING',
          footer: 'We will ping you when the next target is secured.',
        };
      case 'standby':
        if (isLockdown) {
          return {
            badge: 'AUCTION IMMINENT',
            headline: 'Auction lockdown',
            subline: `Watch uplink for credit - Dropping soon`,
            marquee:
              'LOCKDOWN ACTIVE • AUCTION IMMINENT • WATCH UPLINK FOR PLAYER CREDIT • SECURE CREDIT NOW',
            tickerTitle: 'AUCTION ETA',
            tickerStatus: 'AUCTION IMMINENT',
            footer:
              'Watch the uplink to earn your credit before auction starts.',
          };
        }
        if (isWithinHour) {
          return {
            badge: 'LOBBY OPEN',
            headline: 'Auction imminent',
            subline: `Secure your player credit - Good luck`,
            marquee:
              'LIVE LOOT FEED ACTIVE • AUCTION IMMINENT • WATCH UPLINK FOR PLAYER CREDIT • GOOD LUCK',
            tickerTitle: 'AUCTION ETA',
            tickerStatus: 'LOBBY OPEN',
            footer: 'Watch the uplink to earn a credit before go-time.',
          };
        }
        return {
          badge: 'STANDBY',
          headline: 'System standby',
          subline: `Upcoming auction`,
          marquee:
            'STANDBY • LOOT SECURED • SYNC YOUR WATCHES • UPLINK AVAILABLE SOON • WAIT FOR T-MINUS 60',
          tickerTitle: 'AUCTION ETA',
          tickerStatus: 'STANDBY',
          footer:
            'The uplink will be available 60 minutes before the auction starts.',
        };
      case 'live':
      default:
        return {
          badge: lockedIn ? 'PENDING' : 'LIVE',
          headline: lockedIn
            ? `Locked @ $${lockedIn.toFixed(2)}`
            : 'Price decay online',
          subline: lockedIn
            ? 'Hold position while payment clears.'
            : 'Stay frosty. Credits convert to wins.',
          marquee:
            'LIVE FEED • DON’T CHICKEN OUT • TARGET IN SCOPE • LOCK IN WHEN THE PRICE IS RIGHT',
          tickerTitle: 'CURRENT PRICE',
          tickerStatus: lockedIn ? 'PENDING PAYMENT' : 'LIVE',
          footer: 'Wait too long and someone else will pull the trigger.',
        };
    }
  })();

  const feedItems = (() => {
    switch (timeWindow) {
      case 'no-auction':
        return [
          '> No active auction scheduled.',
          '> Auction system cooldown active.',
          '> Scanning for target loot...',
          '> Follow @chickenbids for intel.',
        ];
      case 'standby':
        if (isWithinHour) {
          return [
            '> LOBBY STATUS: OPEN.',
            '> Player access enabled.',
            '> CREDIT REQUIRED FOR ENTRY.',
            '> Initialize uplink to secure credit...',
          ];
        }
        return [
          '> LOBBY STATUS: CLOSED.',
          '> Player access restricted.',
          `> Awaiting operator briefing...`,
          '> Stand by for T-Minus 60 mark...',
        ];
      case 'live':
      default:
        return [
          '> Price decay engine ONLINE.',
          '> Players synced.',
          '> Critical value threshold armed.',
          '> BIDDING ACTION AUTHORIZED.',
        ];
    }
  })();

  const tipsCopy = (() => {
    if (timeWindow === 'no-auction') {
      return 'Register now and follow @chickenbids for early drop intel.';
    }
    if (isLockdown) {
      return 'LOCKDOWN ACTIVE. Watch uplink NOW to secure your credit. Auction starts soon.';
    }
    if (isWithinHour) {
      return 'Watch the uplink early to secure your player credit before the auction starts.';
    }
    if (timeWindow === 'standby') {
      return 'Auction scheduled. Return early to watch uplink and secure your credit.';
    }
    return 'Prices only go down. Nerves of steel win the best loot.';
  })();

  const playerCtaDisabled = !isLoggedIn
    ? false
    : requiresCredit && !hasCredit
      ? false
      : timeWindow === 'live' && !lockedIn
        ? false
        : true;

  // Removed - now using modal buttons directly

  const interstitialLabel = (() => {
    if (timeWindow === 'no-auction') return 'NO UPLINK AVAILABLE';
    if (isWithinHour) return 'WATCH UPLINK FOR CREDIT';
    if (isAuctionLive) return 'WATCH UPLINK FOR CREDIT';
    return 'UPLINK AVAILABLE SOON';
  })();

  const interstitialNeedsAttention = requiresCredit && isLoggedIn && !hasCredit;
  const interstitialDisabled = !isLoggedIn || timeWindow === 'no-auction';

  // Calculate actual remaining time based on server's current price and drop rate
  const remainingMs = useMemo(() => {
    if (
      !currentAuction?.drop_rate ||
      currentAuction?.floor_price == null ||
      !currentAuction?.current_price
    ) {
      return 0;
    }
    const priceRemaining =
      currentAuction.current_price - currentAuction.floor_price;
    const secondsRemaining = priceRemaining / currentAuction.drop_rate;
    const ms = Math.max(0, secondsRemaining * 1000);

    console.log('Remaining calc:', {
      current_price: currentAuction.current_price,
      floor_price: currentAuction.floor_price,
      drop_rate: currentAuction.drop_rate,
      priceRemaining,
      secondsRemaining,
      ms,
    });

    return ms;
  }, [
    currentAuction?.current_price,
    currentAuction?.drop_rate,
    currentAuction?.floor_price,
  ]);

  const remainingSeconds = Math.floor((remainingMs / 1000) % 60)
    .toString()
    .padStart(2, '0');
  const remainingMinutes = Math.floor(remainingMs / 1000 / 60)
    .toString()
    .padStart(2, '0');
  const remainingTimeLabel = `${remainingMinutes}:${remainingSeconds}`;

  let progressWidth = 0;
  let progressClass = styles.progressFill;

  if (
    isAuctionLive &&
    currentAuction?.drop_rate &&
    price &&
    currentAuction.floor_price != null &&
    currentAuction.start_price
  ) {
    // Calculate progress based on actual price drop
    const totalPriceDrop =
      currentAuction.start_price - currentAuction.floor_price;
    const priceRemaining = price - currentAuction.floor_price;
    const progressRatio = priceRemaining / totalPriceDrop;
    progressWidth = Math.max(0, Math.min(100, progressRatio * 100));

    if (progressRatio <= 0.66 && progressRatio > 0.33) {
      progressClass = styles.progressFillMid;
    } else if (progressRatio <= 0.33) {
      progressClass = styles.progressFillLow;
    }
  } else if (
    timeWindow === 'standby' &&
    displayCountdownMs !== null &&
    currentAuction &&
    auctionStartTime
  ) {
    // Single continuous bar that drains from auction creation to live
    // Width = (time remaining) / (total duration from creation to start)
    const auctionCreatedAt = new Date(currentAuction.created_at).getTime();
    const totalDuration = auctionStartTime - auctionCreatedAt;
    const ratio = Math.min(Math.max(displayCountdownMs / totalDuration, 0), 1);
    progressWidth = ratio * 100;

    // Color changes based on urgency, but width keeps draining continuously
    if (isWithinHour) {
      progressClass = styles.progressFillLockdown; // Red/orange for <60 mins
    } else {
      progressClass = styles.progressFillIdle; // Blue for >60 mins
    }
  } else {
    progressWidth = 0;
    progressClass = styles.progressFillIdle;
  }

  const fireLabel = (() => {
    if (!isAuctionLive) return 'STANDBY';
    if (!isLoggedIn) return 'LOGIN REQUIRED';
    if (requiresCredit && !hasCredit) return 'UPLINK REQUIRED';
    if (lockedIn) return 'PENDING';
    return 'LOCK IN';
  })();

  const fireDisabled =
    !isAuctionLive ||
    !isLoggedIn ||
    lockedIn !== null ||
    (requiresCredit && !hasCredit);

  const isPulsing = !isPressed && !fireDisabled;

  const targetTitle =
    timeWindow === 'no-auction'
      ? 'NO ACTIVE TARGET'
      : (currentProduct?.name ?? 'Awaiting Target');
  const targetVariant =
    timeWindow === 'no-auction'
      ? 'Auction schedule manifest is empty.'
      : (currentProduct?.variant ?? 'Stand by for details');
  const targetBadge =
    timeWindow === 'no-auction'
      ? 'SCANNING'
      : timeWindow === 'live'
        ? 'LIVE AUCTION'
        : 'LOOT SECURED';
  const dropTimeLabel =
    !isMounted || !auctionStartTime
      ? 'Stand by'
      : formatDropTime(auctionStartTime);

  const pageClass = (() => {
    if (timeWindow === 'live') return styles.pageLive;
    // Both 'no-auction' and 'standby' use blue scanning background
    return styles.pageScanning;
  })();

  // State for winner profile
  const [winnerProfile, setWinnerProfile] = useState<{
    username: string;
  } | null>(null);

  // Fetch winner profile when auction completes
  useEffect(() => {
    if (currentAuction?.status === 'completed' && currentAuction.winner_id) {
      supabase
        .from('profiles')
        .select('username')
        .eq('id', currentAuction.winner_id)
        .single()
        .then(({ data }) => {
          if (data) setWinnerProfile(data);
        });
    }
  }, [currentAuction?.status, currentAuction?.winner_id]);

  // Real auction end data (populated when auction completes)
  const auctionEndData = useMemo(() => {
    if (!currentAuction || currentAuction.status !== 'completed') {
      // Fallback for dev/testing
      return {
        winnerCallsign: 'UNKNOWN',
        lockedPrice: price,
        startPrice: currentAuction?.start_price || 0,
        floorPrice: currentAuction?.floor_price ?? 0,
        spread: (currentAuction?.start_price || 0) - price,
        duration: '00:00:00',
      };
    }

    // Calculate duration from auction start to end
    const startTime = new Date(currentAuction.start_at).getTime();
    const endTime = new Date(
      currentAuction.ended_at || currentAuction.start_at
    ).getTime();
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / 3600000)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((durationMs % 3600000) / 60000)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor((durationMs % 60000) / 1000)
      .toString()
      .padStart(2, '0');

    return {
      winnerCallsign: winnerProfile?.username || '', // Empty string if no winner
      lockedPrice: currentAuction.winning_price || price,
      startPrice: currentAuction.start_price,
      floorPrice: currentAuction.floor_price,
      spread:
        currentAuction.start_price - (currentAuction.winning_price || price),
      duration: `${hours}:${minutes}:${seconds}`,
    };
  }, [currentAuction, price, winnerProfile]);

  // Build loot data from current product/auction
  const lootData =
    currentProduct && currentAuction
      ? {
          name: currentProduct.name,
          variant: currentProduct.variant || '',
          condition: currentProduct.condition,
          images:
            productImages.length > 0
              ? productImages
              : ['/assets/img/chickenbids-logo.png'],
          contents: currentProduct.contents || [],
          dropTime: formatDropTime(new Date(currentAuction.start_at).getTime()),
          startPrice: currentAuction.start_price,
          floorPrice: currentAuction.floor_price,
          shippingTime: currentProduct.shipping_time,
          shippingMethod: currentProduct.shipping_method,
          returnsPolicy: currentProduct.returns_policy,
        }
      : null;

  // Build profile data from context
  const profileData = player
    ? {
        callsign: player.callsign,
        level: player.level,
        xp: player.xp,
        xpToNextLevel: player.level * 10, // Same formula as DB
        auctionsWon: player.auctions_won,
        totalSpent: player.total_spent,
        avgWinPrice:
          player.auctions_won > 0
            ? player.total_spent / player.auctions_won
            : 0,
        winRate:
          player.total_bids > 0
            ? Math.round((player.auctions_won / player.total_bids) * 100)
            : 0,
        email: user?.email || '',
        phone: player.phone || '',
        memberSince: new Date(player.created_at).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        recentActivity,
      }
    : null;

  // isWinner check moved to AuctionEndModal component

  return (
    <div className={`${styles.page} ${pageClass}`}>
      <div className={styles.hudBar}>
        <button
          className={styles.mobileMenuButton}
          onClick={() => setMobileSidebarOpen(true)}
          aria-label='Open menu'
        >
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <line x1='3' y1='6' x2='21' y2='6' />
            <line x1='3' y1='12' x2='21' y2='12' />
            <line x1='3' y1='18' x2='21' y2='18' />
          </svg>
          INTEL
        </button>

        <div className={styles.mission}>
          <span>
            <div
              className={styles.pulseDot}
              style={{ display: 'inline-block', marginRight: 6 }}
            />
            PLAYERS ONLINE: {onlineCount.toLocaleString()}
          </span>
        </div>

        <div className={styles.meta}>
          <Link href='/'>HOME</Link>
          <span>•</span>
          <Link href='/how-it-works'>HOW IT WORKS</Link>
          <span>•</span>
          <Link href='/terms'>TERMS</Link>
          <span>•</span>
          <Link href='/privacy'>PRIVACY</Link>
        </div>
      </div>
      <div className={styles.container}>
        <main className={styles.main}>
          <section className={styles.leftPane}>
            <div className={styles.itemCard}>
              <div className={styles.itemGlow} />
              <div className={styles.itemBody}>
                <div className={styles.itemLabel}>TARGET LOOT</div>
                <div className={styles.itemName}>{targetTitle}</div>
                <div className={styles.itemSub}>{targetVariant}</div>
                <div
                  className={`${styles.itemTag} ${
                    timeWindow === 'no-auction'
                      ? styles.itemTagScanning
                      : timeWindow === 'live'
                        ? styles.itemTagLive
                        : ''
                  }`}
                >
                  {targetBadge}
                </div>

                <button
                  className={`${
                    timeWindow === 'no-auction'
                      ? styles.itemDetailsButtonDisabled
                      : styles.itemDetailsButton
                  }`}
                  onClick={() => setLootIntelModalOpen(true)}
                >
                  {timeWindow === 'no-auction' ? 'NO INTEL' : 'LOOT INTEL'}
                </button>
              </div>
            </div>
            <div className={styles.playerModule}>
              <div className={styles.playerHeader}>
                <div className={styles.sideTitle}>PLAYER STATS</div>
              </div>
              <div className={styles.playerBody}>
                <div className={styles.playerMetaRow}>
                  <span>Callsign</span>
                  {isLoggedIn ? (
                    <button
                      className={styles.playerCallsignButton}
                      onClick={() => setProfileModalOpen(true)}
                    >
                      @{player?.callsign}
                    </button>
                  ) : (
                    <span className={styles.playerCallsign}>DISCONNECTED</span>
                  )}
                </div>
                <div className={styles.playerMetaRow}>
                  <span>Player XP</span>
                  <span className={styles.playerCallsign}>
                    {isLoggedIn ? player?.xp : '0'}
                  </span>
                </div>
                <div className={styles.playerMetaRow}>
                  <span>Bid Credits</span>
                  <span
                    className={`${styles.creditValue} ${
                      hasCredit ? styles.creditArmed : styles.creditEmpty
                    }`}
                  >
                    {hasCredit ? '1 - READY' : 'WATCH UPLINK FOR CREDIT'}
                  </span>
                </div>
              </div>
              <div className={styles.playerActions}>
                <div className={styles.playerActionsLogin}>
                  {isLoggedIn ? (
                    <button
                      className={styles.logoutButton}
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  ) : (
                    <>
                      <button
                        className={`${styles.playerButton} ${
                          styles.playerButtonPrimary
                        } ${
                          playerCtaDisabled ? styles.playerButtonDisabled : ''
                        }`}
                        disabled={playerCtaDisabled}
                        onClick={() => setLoginModalOpen(true)}
                      >
                        Login
                      </button>
                      <button
                        className={`${styles.playerButton} ${
                          styles.playerButtonPrimary
                        } ${
                          playerCtaDisabled ? styles.playerButtonDisabled : ''
                        }`}
                        disabled={playerCtaDisabled}
                        onClick={() => setRegisterModalOpen(true)}
                      >
                        Register
                      </button>
                    </>
                  )}
                </div>
                <button
                  className={`${styles.playerButton} ${
                    interstitialNeedsAttention
                      ? styles.playerButtonHot
                      : styles.playerButtonDisabled
                  } ${
                    interstitialNeedsAttention ? styles.playerButtonPulse : ''
                  }`}
                  disabled={interstitialDisabled}
                  onClick={interstitialDisabled ? undefined : openInterstitial}
                >
                  {interstitialLabel}
                </button>
              </div>
            </div>

            <div className={styles.volumeCard}>
              <VolumeControl
                volume={musicVolume}
                onChange={setMasterMusicVolume}
                label='MUSIC'
              />
              <VolumeControl
                volume={voiceVolume}
                onChange={setMasterVoiceVolume}
                label='COMMS'
              />
              {nowPlaying && (
                <NowPlaying
                  trackName={nowPlaying.name}
                  artist={nowPlaying.artist}
                />
              )}
            </div>

            <div className={styles.infoPanel}>
              <div className={styles.infoHeader}>
                <span className={styles.sideTitle}>AUCTION INTEL</span>
              </div>
              <div className={styles.infoRow}>
                <span>PHASE</span>
                <span>{stageCopy.badge}</span>
              </div>
              <div className={styles.infoRow}>
                <span>UPCOMING AUCTION</span>
                <span>
                  {timeWindow === 'no-auction' ? 'CLASSIFIED' : dropTimeLabel}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span>START PRICE</span>
                <span>
                  {timeWindow === 'no-auction'
                    ? 'CLASSIFIED'
                    : `$${(currentAuction?.start_price || 0).toFixed(0)}`}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span>FLOOR PRICE</span>
                <span>
                  {timeWindow === 'no-auction'
                    ? 'CLASSIFIED'
                    : `$${(currentAuction?.floor_price ?? 0).toFixed(0)}`}
                </span>
              </div>
            </div>

            <div className={styles.sidePanel}>
              <div className={styles.sideTitle}>AUCTION FEED</div>
              <ul className={styles.logList}>
                {feedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={styles.sidePanelSecondary}>
              <div className={styles.sideTitle}>TIPS</div>
              <p>{tipsCopy}</p>
            </div>
          </section>

          <section className={styles.centerPane}>
            <div className={styles.stageWrapper}>
              <div className={styles.liveFeedBar}>
                <span className={styles.liveFeedDot} />
                <div className={styles.liveFeedMarquee}>
                  <span className={styles.liveFeedMarqueeInner}>
                    {stageCopy.marquee}
                  </span>
                </div>
              </div>

              <div
                className={`${styles.stageViewport} ${
                  styles[`stage-${timeWindow}`]
                } ${isWithinHour ? styles.stageLockdown : ''}`}
              >
                <div className={styles.stageOverlay} />
                <div className={styles.stageScanlines} />
                <div className={styles.stageContent}>
                  <span className={styles.stageBadge}>{stageCopy.badge}</span>
                  <h2>{stageCopy.headline}</h2>
                  <p>{stageCopy.subline}</p>
                </div>
                <div className={styles.stageLogo}>
                  <Image
                    src='/assets/img/chickenbids-logo.png'
                    alt='CHICKENBIDS'
                    width={150}
                    height={150}
                    draggable={false}
                  />
                </div>

                {/* Comms Portrait Overlay */}
                <CommsPortrait
                  isVisible={!!activeVoice}
                  operatorName={
                    activeVoice &&
                    [
                      'backup',
                      'cant-hold-them',
                      'evac',
                      'player-down',
                      'cant-do-this',
                      'one-last-try',
                    ].includes(activeVoice)
                      ? 'ROOSTER'
                      : 'HARPY'
                  }
                  imageSrc={
                    activeVoice &&
                    [
                      'backup',
                      'cant-hold-them',
                      'evac',
                      'player-down',
                      'cant-do-this',
                    ].includes(activeVoice)
                      ? '/assets/img/rooster.webp'
                      : activeVoice === 'one-last-try'
                        ? '/assets/img/rooster-go.webp'
                        : activeVoice === 'pathetic'
                          ? '/assets/img/harpy-evil.webp'
                          : '/assets/img/harpy.webp'
                  }
                />
              </div>
            </div>

            <div className={styles.tickerShell}>
              <div className={styles.tickerHeader}>
                <span>{stageCopy.tickerTitle}</span>
                <span className={styles.statusLive}>
                  <span
                    className={`${styles.pulseDot} ${
                      timeWindow === 'no-auction'
                        ? styles.pulseDotOffline
                        : !isAuctionLive && isWithinHour
                          ? styles.pulseDotLockdown
                          : !isAuctionLive
                            ? styles.pulseDotStandby
                            : lockedIn
                              ? styles.pulseDotPending
                              : ''
                    }`}
                  />
                  {stageCopy.tickerStatus}
                </span>
              </div>

              <div
                className={`${styles.tickerValue} ${
                  lockedIn ? styles.tickerLocked : ''
                } ${!isAuctionLive ? styles.tickerCountdown : ''}`}
              >
                {isAuctionLive ? (
                  <>
                    <span className={styles.currency}>$</span>
                    <span className={styles.intPart}>
                      {Math.floor(displayPrice)}.
                      {Math.floor((displayPrice % 1) * 10)}
                      <span className={styles.blurDigit}>{blurDigit}</span>
                    </span>
                  </>
                ) : (
                  <span className={styles.tickerCountdownValue}>
                    {timeWindow === 'no-auction' ? 'STANDBY' : countdownLabel}
                  </span>
                )}
              </div>

              <div className={styles.progressTrack}>
                <div
                  className={progressClass}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              <div className={styles.tickerFooter}>
                <span>{stageCopy.footer}</span>
                <span className={styles.tickerTimer}>
                  {isAuctionLive && `REMAINING ${remainingTimeLabel}`}
                </span>
              </div>
            </div>
            <motion.button
              className={styles.fireButton}
              onClick={handleFire}
              disabled={fireDisabled}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onHoverEnd={() => {
                setIsPressed(false);
              }}
              onTapStart={() => setIsPressed(true)}
              onTap={() => setIsPressed(false)}
              onTapCancel={() => setIsPressed(false)}
            >
              <motion.span
                className={styles.fireInner}
                animate={{
                  scale: isPulsing ? [1, 1.1, 1] : 1,
                  filter: isPulsing
                    ? ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                    : 'brightness(1)',
                }}
                transition={{
                  scale: isPulsing
                    ? {
                        duration: 1,
                        repeat: Infinity,
                        repeatType: 'loop',
                        ease: 'easeInOut',
                      }
                    : {
                        duration: 0.15,
                        ease: 'easeOut',
                      },
                  filter: isPulsing
                    ? {
                        duration: 1,
                        repeat: Infinity,
                        repeatType: 'loop',
                        ease: 'easeInOut',
                      }
                    : {
                        duration: 0.15,
                        ease: 'easeOut',
                      },
                }}
              >
                {fireLabel}
              </motion.span>
            </motion.button>

            {/* Mobile Credit Box - shows below FIRE button on mobile */}
            <div className={styles.mobileCreditBox}>
              <div className={styles.mobileCreditStatus}>
                <span className={styles.mobileCreditLabel}>BID CREDITS</span>
                <span
                  className={`${styles.mobileCreditValue} ${
                    hasCredit ? styles.creditArmed : styles.creditEmpty
                  }`}
                >
                  {hasCredit ? '1 - READY' : '0'}
                </span>
              </div>
              {!hasCredit && (
                <button
                  className={`${styles.mobileUplinkButton} ${
                    interstitialDisabled
                      ? styles.mobileUplinkButtonDisabled
                      : ''
                  }`}
                  disabled={interstitialDisabled}
                  onClick={interstitialDisabled ? undefined : openInterstitial}
                >
                  WATCH UPLINK FOR CREDIT
                </button>
              )}
            </div>
          </section>
        </main>
        {isDevEnv && (
          <DevControls
            devOverride={devOverride}
            devStandbyLockdown={devStandbyLockdown}
            timeMultiplier={timeMultiplier}
            onDevOverrideChange={updateDevOverride}
            onDevStandbyLockdownToggle={() =>
              setDevStandbyLockdown((prev) => !prev)
            }
            onTimeMultiplierChange={setTimeMultiplier}
            onTestEndModal={() => setAuctionEndModalOpen(true)}
            onToast={setToast}
          />
        )}
      </div>

      <AnimatePresence>
        <InterstitialModal
          isOpen={interstitialOpen}
          adProgress={adProgress}
          onClaim={grantCredit}
        />
      </AnimatePresence>

      <LaunchCountdown
        isOpen={launchCountdownOpen}
        onComplete={handleLaunchComplete}
        currentTime={now}
        timeMultiplier={timeMultiplier}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {auctionEndModalOpen && currentAuction && (
          <AuctionEndModal
            isOpen={auctionEndModalOpen}
            onClose={() => setAuctionEndModalOpen(false)}
            auctionData={auctionEndData}
            isWinner={currentAuction.winner_id === user?.id}
            isLoggedIn={isLoggedIn}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {registerModalOpen && (
          <RegisterModal
            isOpen={registerModalOpen}
            onClose={() => setRegisterModalOpen(false)}
            onSwitchToLogin={() => {
              setRegisterModalOpen(false);
              setLoginModalOpen(true);
            }}
            onSuccess={() => {
              setToast('ACCOUNT CREATED. WELCOME ABOARD!');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loginModalOpen && (
          <LoginModal
            isOpen={loginModalOpen}
            onClose={() => {
              setLoginModalOpen(false);
              setShowEmailConfirmed(false);
            }}
            onSwitchToRegister={() => {
              setLoginModalOpen(false);
              setRegisterModalOpen(true);
              setShowEmailConfirmed(false);
            }}
            onSuccess={() => {
              setLoginModalOpen(false);
              setShowEmailConfirmed(false);
              setToast('LOGIN SUCCESSFUL');
            }}
            showConfirmedMessage={showEmailConfirmed}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lootIntelModalOpen && lootData && (
          <LootIntelModal
            isOpen={lootIntelModalOpen}
            onClose={() => setLootIntelModalOpen(false)}
            lootData={lootData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileModalOpen && isLoggedIn && profileData && (
          <ProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            playerData={profileData}
            onLogout={() => {
              handleLogout();
              setProfileModalOpen(false);
            }}
            onUpdateEmail={async (email) => {
              if (!user) return;

              const { error } = await supabase
                .from('profiles')
                .update({ email })
                .eq('id', user.id);

              if (error) {
                setToast(`ERROR: ${error.message}`);
              } else {
                await refreshProfile();
                setToast('EMAIL UPDATED');
              }
            }}
            onUpdatePhone={async (phone) => {
              if (!user) return;

              const { error } = await supabase
                .from('profiles')
                .update({ phone })
                .eq('id', user.id);

              if (error) {
                setToast(`ERROR: ${error.message}`);
              } else {
                await refreshProfile();
                setToast('PHONE UPDATED');
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bidLockModalOpen && checkoutUrl && lockExpiresAt && (
          <BidLockModal
            isOpen={bidLockModalOpen}
            lockedPrice={lockedIn || price}
            expiresAt={lockExpiresAt || 0}
            clientSecret={checkoutUrl} // Reusing this state for clientSecret
            onCancel={handleCancelBid}
            onSuccess={() => {
              console.log('Payment successful!');
              setToast('PAYMENT SUCCESSFUL - PROCESSING WIN');
              setBidLockModalOpen(false);
              // Realtime will trigger AuctionEndModal when webhook completes
            }}
            currentTime={now}
            lockDurationMs={BID_LOCK_DURATION_MS}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {spectatorLock && (
          <SpectatorLockModal
            isOpen={!!spectatorLock}
            lockedPrice={spectatorLock.price}
            lockExpiresAt={spectatorLock.expiresAt}
            onExpire={() => setSpectatorLock(null)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      >
        <div className={styles.playerModule}>
          <div className={styles.playerHeader}>
            <div className={styles.sideTitle}>PLAYER STATS</div>
          </div>
          <div className={styles.playerBody}>
            <div className={styles.playerMetaRow}>
              <span>Callsign</span>
              {isLoggedIn ? (
                <button
                  className={styles.playerCallsignButton}
                  onClick={() => {
                    setProfileModalOpen(true);
                    setMobileSidebarOpen(false);
                  }}
                >
                  @{player?.callsign}
                </button>
              ) : (
                <span className={styles.playerCallsign}>DISCONNECTED</span>
              )}
            </div>
            <div className={styles.playerMetaRow}>
              <span>Player XP</span>
              <span className={styles.playerCallsign}>
                {isLoggedIn ? player?.xp : '0'}
              </span>
            </div>
            <div className={styles.playerMetaRow}>
              <span>Bid Credits</span>
              <span
                className={`${styles.creditValue} ${
                  hasCredit ? styles.creditArmed : styles.creditEmpty
                }`}
              >
                {hasCredit ? '1 - READY' : 'WATCH UPLINK FOR CREDIT'}
              </span>
            </div>
          </div>
          <div className={styles.playerActions}>
            <div className={styles.playerActionsLogin}>
              {isLoggedIn ? (
                <button className={styles.logoutButton} onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <>
                  <button
                    className={`${styles.playerButton} ${
                      styles.playerButtonPrimary
                    } ${playerCtaDisabled ? styles.playerButtonDisabled : ''}`}
                    disabled={playerCtaDisabled}
                    onClick={() => {
                      setLoginModalOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    Login
                  </button>
                  <button
                    className={`${styles.playerButton} ${
                      styles.playerButtonPrimary
                    } ${playerCtaDisabled ? styles.playerButtonDisabled : ''}`}
                    disabled={playerCtaDisabled}
                    onClick={() => {
                      setRegisterModalOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
            <button
              className={`${styles.playerButton} ${
                interstitialNeedsAttention
                  ? styles.playerButtonHot
                  : styles.playerButtonDisabled
              } ${interstitialNeedsAttention ? styles.playerButtonPulse : ''}`}
              disabled={interstitialDisabled}
              onClick={
                interstitialDisabled
                  ? undefined
                  : () => {
                      openInterstitial();
                      setMobileSidebarOpen(false);
                    }
              }
            >
              {interstitialLabel}
            </button>
          </div>
        </div>

        <div className={styles.volumeCard}>
          <VolumeControl
            volume={musicVolume}
            onChange={setMasterMusicVolume}
            label='MUSIC'
          />
          <VolumeControl
            volume={voiceVolume}
            onChange={setMasterVoiceVolume}
            label='COMMS'
          />
          {nowPlaying && (
            <NowPlaying
              trackName={nowPlaying.name}
              artist={nowPlaying.artist}
            />
          )}
        </div>

        <div className={styles.infoPanel}>
          <div className={styles.infoHeader}>
            <span className={styles.sideTitle}>AUCTION INTEL</span>
          </div>
          <div className={styles.infoRow}>
            <span>PHASE</span>
            <span>{stageCopy.badge}</span>
          </div>
          <div className={styles.infoRow}>
            <span>UPCOMING AUCTION</span>
            <span>
              {timeWindow === 'no-auction' ? 'CLASSIFIED' : dropTimeLabel}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span>START PRICE</span>
            <span>
              {timeWindow === 'no-auction'
                ? 'CLASSIFIED'
                : `$${(currentAuction?.start_price || 0).toFixed(0)}`}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span>FLOOR PRICE</span>
            <span>
              {timeWindow === 'no-auction'
                ? 'CLASSIFIED'
                : `$${(currentAuction?.floor_price ?? 0).toFixed(0)}`}
            </span>
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.sideTitle}>AUCTION FEED</div>
          <ul className={styles.logList}>
            {feedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={styles.sidePanelSecondary}>
          <div className={styles.sideTitle}>TIPS</div>
          <p>{tipsCopy}</p>
        </div>
      </MobileSidebar>

      {/* Audio Permission Modal */}
      <AudioPermissionModal
        isOpen={audioPermissionModalOpen}
        onClose={() => setAudioPermissionModalOpen(false)}
        onAllow={() => {
          setAudioEnabled(true);
          setShouldStartAmbient(true);
        }}
        onDeny={() => setAudioEnabled(false)}
      />
    </div>
  );
}
