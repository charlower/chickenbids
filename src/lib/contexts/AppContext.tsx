'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
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
  };

  // Fetch credits
  const fetchCredits = async (userId: string) => {
    const { data, error } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      setCredits(data.balance);
    }
  };

  // Fetch products (runs once)
  const fetchProducts = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('active', true);

    if (productsData && !productsError) {
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
    }
  };

  // Refresh functions (can be called manually)
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshCredits = async () => {
    if (user) await fetchCredits(user.id);
  };

  // Auth state listener
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchCredits(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        await fetchProfile(session.user.id);
        await fetchCredits(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setPlayer(null);
        setCredits(0);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch products once on mount
  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      if (mounted) await fetchProducts();
    };

    loadProducts();

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
