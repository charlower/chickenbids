'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Types
type PlayerProfile = {
  id: string;
  callsign: string;
  email: string | null;
  phone: string | null;
  level: number;
  xp: number;
  total_spent: number;
  auctions_won: number;
  total_bids: number;
  marketing_opt_in: boolean;
  created_at: string;
  is_admin: boolean;
};

type ProductData = {
  id: string;
  name: string;
  variant: string | null;
  description: string | null;
  condition: string;
  contents: string[];
  retail_price: number | null;
  shipping_time: string;
  shipping_method: string;
  returns_policy: string;
  images: string[];
};

type AppContextType = {
  // Auth
  user: User | null;
  isLoading: boolean;

  // Player Profile
  player: PlayerProfile | null;

  // Credits
  credits: number;

  // Products
  products: ProductData[];

  // Actions
  refreshProfile: () => Promise<void>;
  refreshCredits: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [credits, setCredits] = useState(0);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track if we've initialized to avoid double-init from Strict Mode
  const initRef = useRef(false);
  const mountedRef = useRef(true);

  // Fetch player profile
  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[Auth] Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return;
      }

      if (data && mountedRef.current) {
        console.log('[Auth] ✓ Profile loaded:', data.username);
        setPlayer({
          id: data.id,
          callsign: data.username,
          email: data.email,
          phone: data.phone,
          level: data.level,
          xp: data.xp,
          total_spent: data.total_spent,
          auctions_won: data.auctions_won,
          total_bids: data.total_bids,
          marketing_opt_in: data.marketing_opt_in,
          created_at: data.created_at,
          is_admin: data.is_admin || false,
        });
      }
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
    }
  }, []);

  // Fetch credits
  const fetchCredits = useCallback(async (userId: string) => {
    console.log('[Auth] Fetching credits for:', userId);
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[Auth] Credits fetch error:', error);
        }
        if (mountedRef.current) setCredits(0);
        return;
      }

      if (data && mountedRef.current) {
        console.log('[Auth] ✓ Credits loaded:', data.balance);
        setCredits(data.balance);
      }
    } catch (err) {
      console.error('[Auth] Credits fetch exception:', err);
      if (mountedRef.current) setCredits(0);
    }
  }, []);

  // Load user data (profile + credits)
  const loadUserData = useCallback(
    async (user: User) => {
      console.log('[Auth] Loading user data for:', user.id);
      await Promise.all([fetchProfile(user.id), fetchCredits(user.id)]);
    },
    [fetchProfile, fetchCredits]
  );

  // Clear user data on logout
  const clearUserData = useCallback(() => {
    console.log('[Auth] Clearing user data');
    setPlayer(null);
    setCredits(0);
  }, []);

  // Refresh functions (can be called manually)
  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const refreshCredits = useCallback(async () => {
    if (user) await fetchCredits(user.id);
  }, [user, fetchCredits]);

  // Get user with retry
  const getUserWithRetry = useCallback(
    async (retries = 3): Promise<User | null> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[Auth] getUser attempt ${i + 1}/${retries}`);
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error) {
            console.log(
              `[Auth] getUser error (attempt ${i + 1}):`,
              error.message
            );
            // If auth session missing, that's a valid "no user" response
            if (error.message.includes('Auth session missing')) {
              return null;
            }
            // For other errors, retry
            if (i < retries - 1) {
              await new Promise((r) => setTimeout(r, 100 * (i + 1)));
              continue;
            }
          }

          return user;
        } catch (err) {
          console.error(`[Auth] getUser exception (attempt ${i + 1}):`, err);
          if (i < retries - 1) {
            await new Promise((r) => setTimeout(r, 100 * (i + 1)));
          }
        }
      }
      return null;
    },
    []
  );

  // MAIN AUTH INITIALIZATION
  useEffect(() => {
    // Prevent double initialization in Strict Mode
    if (initRef.current) {
      console.log('[Auth] Already initialized, skipping');
      return;
    }
    initRef.current = true;
    mountedRef.current = true;

    console.log('[Auth] ========== INITIALIZING ==========');
    console.log(
      '[Auth] Document cookies exist:',
      typeof document !== 'undefined' && document.cookie.length > 0
    );

    let authStateSubscription: { unsubscribe: () => void } | null = null;

    const initialize = async () => {
      // Small delay to ensure cookies are available after page load
      await new Promise((r) => setTimeout(r, 50));

      if (!mountedRef.current) return;

      // 1. Try to get user with retries
      const user = await getUserWithRetry(3);

      if (!mountedRef.current) return;

      if (user) {
        console.log('[Auth] ✓ User found:', user.id);
        setUser(user);
        await loadUserData(user);
      } else {
        console.log('[Auth] ✗ No user found');
        setUser(null);
        clearUserData();
      }

      if (mountedRef.current) {
        setIsLoading(false);
      }

      // 2. Subscribe to auth changes AFTER initial load
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;

        console.log(
          '[Auth] Event:',
          event,
          'User:',
          session?.user?.id ?? 'NONE'
        );

        // Skip INITIAL_SESSION since we already handled it
        if (event === 'INITIAL_SESSION') {
          return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadUserData(currentUser);
        } else {
          clearUserData();
        }
      });

      authStateSubscription = subscription;
    };

    initialize();

    // Refresh auth when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        console.log('[Auth] Tab visible - refreshing auth');
        const user = await getUserWithRetry(1);
        if (mountedRef.current) {
          setUser(user);
          if (user) {
            await loadUserData(user);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[Auth] Cleanup');
      mountedRef.current = false;
      initRef.current = false;
      authStateSubscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getUserWithRetry, loadUserData, clearUserData]);

  // Fetch products once on mount
  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      console.log('[Auth] Fetching products');
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);

        if (productsError) {
          console.error('[Auth] Products fetch error:', productsError);
          return;
        }

        if (productsData && mounted) {
          const productsWithImages = await Promise.all(
            productsData.map(async (product) => {
              const { data: imagesData } = await supabase
                .from('product_images')
                .select('url')
                .eq('product_id', product.id)
                .order('position');

              return {
                id: product.id,
                name: product.name,
                variant: product.variant,
                description: product.description,
                condition: product.condition,
                contents: product.contents || [],
                retail_price: product.retail_price,
                shipping_time: product.shipping_time,
                shipping_method: product.shipping_method,
                returns_policy: product.returns_policy,
                images: imagesData?.map((img) => img.url) || [],
              };
            })
          );

          setProducts(productsWithImages);
          console.log('[Auth] ✓ Products loaded:', productsWithImages.length);
        }
      } catch (err) {
        console.error('[Auth] Products fetch exception:', err);
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isLoading,
        player,
        credits,
        products,
        refreshProfile,
        refreshCredits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
