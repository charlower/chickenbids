'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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

  // Fetch player profile
  const fetchProfile = useCallback(async (userId: string) => {
    console.log('[AppContext] Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AppContext] Profile fetch error:', error);
        return;
      }

      if (data) {
        console.log('[AppContext] Profile loaded:', data.username);
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
      console.error('[AppContext] Profile fetch exception:', err);
    }
  }, []);

  // Fetch credits
  const fetchCredits = useCallback(async (userId: string) => {
    console.log('[AppContext] Fetching credits for:', userId);
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) {
        // No credits row yet is OK - might be a new user
        if (error.code !== 'PGRST116') {
          console.error('[AppContext] Credits fetch error:', error);
        }
        setCredits(0);
        return;
      }

      if (data) {
        console.log('[AppContext] Credits loaded:', data.balance);
        setCredits(data.balance);
      }
    } catch (err) {
      console.error('[AppContext] Credits fetch exception:', err);
      setCredits(0);
    }
  }, []);

  // Load user data (profile + credits)
  const loadUserData = useCallback(
    async (user: User) => {
      console.log('[AppContext] Loading user data for:', user.id);
      await Promise.all([fetchProfile(user.id), fetchCredits(user.id)]);
    },
    [fetchProfile, fetchCredits]
  );

  // Clear user data on logout
  const clearUserData = useCallback(() => {
    console.log('[AppContext] Clearing user data');
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

  // Auth state listener - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    console.log('[AppContext] Setting up auth listener');

    // onAuthStateChange is the ONLY source of truth
    // It fires immediately with INITIAL_SESSION event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        '[AppContext] Auth event:',
        event,
        'User:',
        session?.user?.id
      );

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // User is logged in - load their data
        await loadUserData(currentUser);
      } else {
        // User is logged out - clear data
        clearUserData();
      }

      // Only set loading false after we've processed the auth state
      setIsLoading(false);
    });

    return () => {
      console.log('[AppContext] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [loadUserData, clearUserData]);

  // Fetch products once on mount
  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      console.log('[AppContext] Fetching products');
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);

        if (productsError) {
          console.error('[AppContext] Products fetch error:', productsError);
          return;
        }

        if (productsData && mounted) {
          // Fetch images for each product
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
          console.log(
            '[AppContext] Products loaded:',
            productsWithImages.length
          );
        }
      } catch (err) {
        console.error('[AppContext] Products fetch exception:', err);
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
