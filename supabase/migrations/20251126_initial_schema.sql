-- =====================================================
-- CHICKENBIDS DATABASE SCHEMA - MVP
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE auction_status AS ENUM ('scheduled', 'live', 'paused', 'completed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('active', 'won', 'lost', 'expired');

-- =====================================================
-- TABLE: profiles
-- =====================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  phone text,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  total_spent decimal(10,2) DEFAULT 0,
  auctions_won integer DEFAULT 0,
  total_bids integer DEFAULT 0,
  marketing_opt_in boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$')
);

CREATE INDEX idx_profiles_username ON profiles(username);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';

-- =====================================================
-- TABLE: products
-- =====================================================

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variant text,
  description text,
  condition text NOT NULL,
  contents jsonb NOT NULL DEFAULT '[]'::jsonb,
  retail_price decimal(10,2),
  shipping_time text NOT NULL,
  shipping_method text NOT NULL,
  returns_policy text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE products IS 'Product catalog for auction items';

-- =====================================================
-- TABLE: product_images
-- =====================================================

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

COMMENT ON TABLE product_images IS 'Images for products stored in Supabase Storage';

-- =====================================================
-- TABLE: auctions
-- =====================================================

CREATE TABLE auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  status auction_status NOT NULL DEFAULT 'scheduled',
  start_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  paused_at timestamp with time zone,
  resumed_at timestamp with time zone,
  start_price decimal(10,2) NOT NULL,
  floor_price decimal(10,2) NOT NULL,
  current_price decimal(10,2),
  drop_per_tick decimal(10,2) NOT NULL DEFAULT 1.00,
  tick_interval_ms integer NOT NULL DEFAULT 10,
  locked_by uuid REFERENCES profiles(id),
  locked_at timestamp with time zone,
  lock_expires_at timestamp with time zone,
  winner_id uuid REFERENCES profiles(id),
  winning_price decimal(10,2),
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT price_check CHECK (start_price > floor_price)
);

CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_start_at ON auctions(start_at);
CREATE INDEX idx_auctions_product_id ON auctions(product_id);
CREATE INDEX idx_auctions_locked_by ON auctions(locked_by);

COMMENT ON TABLE auctions IS 'Individual auction instances';

-- =====================================================
-- TABLE: bids
-- =====================================================

CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bid_price decimal(10,2) NOT NULL,
  status bid_status NOT NULL DEFAULT 'active',
  locked_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  payment_link_sent_at timestamp with time zone,
  payment_completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_bids_status ON bids(status);

COMMENT ON TABLE bids IS 'User bid attempts (lock-in actions)';

-- =====================================================
-- TABLE: credits
-- =====================================================

CREATE TABLE credits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  last_earned_at timestamp with time zone,
  last_spent_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT balance_check CHECK (balance >= 0 AND balance <= 1)
);

COMMENT ON TABLE credits IS 'User credit balance for auction entry';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Reset all credits when auction completes
CREATE OR REPLACE FUNCTION reset_auction_credits(auction_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE credits SET balance = 0, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Spend credit when user locks in bid
CREATE OR REPLACE FUNCTION spend_credit_on_bid()
RETURNS trigger AS $$
BEGIN
  UPDATE credits 
  SET balance = 0, last_spent_at = now(), updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Award XP when auction ends
CREATE OR REPLACE FUNCTION award_xp_on_auction_end()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Award 10 XP to winner
    IF NEW.winner_id IS NOT NULL THEN
      UPDATE profiles 
      SET xp = xp + 10, 
          auctions_won = auctions_won + 1,
          total_spent = total_spent + NEW.winning_price,
          updated_at = now()
      WHERE id = NEW.winner_id;
    END IF;
    
    -- Award 1 XP to all participants (losers)
    UPDATE profiles 
    SET xp = xp + 1, 
        total_bids = total_bids + 1,
        updated_at = now()
    WHERE id IN (
      SELECT DISTINCT user_id 
      FROM bids 
      WHERE auction_id = NEW.id 
        AND user_id != NEW.winner_id
    );
    
    -- Reset all credits
    PERFORM reset_auction_credits(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-create credits row for new users
CREATE OR REPLACE FUNCTION create_credits_for_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO credits (user_id, balance, updated_at)
  VALUES (NEW.id, 0, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Level up when XP thresholds hit
CREATE OR REPLACE FUNCTION check_level_up()
RETURNS trigger AS $$
DECLARE
  xp_for_next_level integer;
BEGIN
  -- Simple level formula: Level N requires N * 10 XP
  xp_for_next_level := NEW.level * 10;
  
  IF NEW.xp >= xp_for_next_level THEN
    UPDATE profiles 
    SET level = level + 1, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_email_confirmed();

-- Helper function for webhook to complete bid (bypasses RLS)
CREATE OR REPLACE FUNCTION complete_bid_for_winner(
  p_auction_id uuid,
  p_user_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE bids 
  SET 
    status = 'won',
    payment_completed_at = now(),
    updated_at = now()
  WHERE auction_id = p_auction_id
    AND user_id = p_user_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for webhook to complete auction
CREATE OR REPLACE FUNCTION complete_auction_for_winner(
  p_auction_id uuid,
  p_winner_id uuid,
  p_winning_price decimal
)
RETURNS json 
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.auctions 
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    winning_price = p_winning_price,
    ended_at = now(),
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = now()
  WHERE id = p_auction_id
  RETURNING json_build_object(
    'rows_updated', 1,
    'auction_id', id,
    'winner_id', winner_id,
    'winning_price', winning_price
  );
$$;

-- Add trigger to auto-set current_price on new auctions
CREATE OR REPLACE FUNCTION set_current_price_on_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.current_price IS NULL THEN
    NEW.current_price := NEW.start_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_current_price
  BEFORE INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION set_current_price_on_insert();

-- =====================================================
-- TICK AUCTION PRICE AND CRON JOB
-- =====================================================

-- Function: Tick auction price
CREATE OR REPLACE FUNCTION tick_auction_price()
RETURNS void AS $$
DECLARE
  completed_auction_id uuid;
BEGIN
  -- Update price (drop by drop_rate, but don't go below floor)
  UPDATE auctions
  SET 
    current_price = GREATEST(
      current_price - drop_rate,
      floor_price
    ),
    updated_at = now()
  WHERE status = 'live'
    AND current_price > floor_price
    AND locked_by IS NULL;

  -- Complete auctions that reached floor price with no winner
  -- Store the auction ID for XP award
  UPDATE auctions
  SET 
    status = 'completed',
    ended_at = now(),
    updated_at = now()
  WHERE status = 'live'
    AND current_price <= floor_price
    AND winner_id IS NULL
    AND locked_by IS NULL
  RETURNING id INTO completed_auction_id;

  -- Award 1 XP to all participants (if auction was completed)
  IF completed_auction_id IS NOT NULL THEN
    UPDATE profiles
    SET xp = xp + 1
    WHERE id IN (
      SELECT DISTINCT user_id 
      FROM bids 
      WHERE auction_id = completed_auction_id
    );

    -- Reset credits for all participants
    UPDATE credits
    SET balance = 0
    WHERE user_id IN (
      SELECT DISTINCT user_id 
      FROM bids 
      WHERE auction_id = completed_auction_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule a cron job to check every second for auctions that should go live
SELECT cron.schedule(
  'auto-start-auctions',
  '* * * * * *', -- Every second
  $$
    UPDATE auctions 
    SET 
      status = 'live',
      updated_at = now()
    WHERE status = 'scheduled' 
      AND start_at <= now();
  $$
);

-- =====================================================
-- ADMIN POLICIES
-- =====================================================

-- Add index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
-- Update RLS policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update auction status
CREATE POLICY "Admins can update auctions"
  ON auctions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to insert auctions
CREATE POLICY "Admins can create auctions"
  ON auctions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to manage products
CREATE POLICY "Admins can read all products"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to manage product images
CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );


ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Spend credit when bid is created
CREATE TRIGGER trigger_spend_credit_on_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION spend_credit_on_bid();

-- Trigger: Award XP when auction ends
CREATE TRIGGER trigger_award_xp_on_auction_end
  AFTER UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION award_xp_on_auction_end();

-- Trigger: Auto-create credits for new users
CREATE TRIGGER trigger_create_credits_for_new_user
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_credits_for_new_user();

-- Trigger: Level up check
CREATE TRIGGER trigger_check_level_up
  AFTER UPDATE OF xp ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_level_up();

-- Triggers: Auto-update updated_at on all tables
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-create profile on email confirmation
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_email_confirmed();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can view public profile data"
  ON profiles FOR SELECT
  USING (true);

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (active = true);

-- Product images policies
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

-- Auctions policies
CREATE POLICY "Anyone can view scheduled or live auctions"
  ON auctions FOR SELECT
  USING (status IN ('scheduled', 'live', 'paused'));

CREATE POLICY "Anyone can view completed auctions"
  ON auctions FOR SELECT
  USING (status = 'completed');

-- Allow users to lock auctions when bidding
CREATE POLICY "Users can lock live auctions"
  ON auctions FOR UPDATE
  USING (status = 'live')
  WITH CHECK (status = 'live');

-- Bids policies
CREATE POLICY "Users can view their own bids"
  ON bids FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Credits policies
CREATE POLICY "Users can view their own credits"
  ON credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON credits FOR UPDATE
  USING (auth.uid() = user_id);

  CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);


-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_bid_for_winner(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION complete_bid_for_winner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_auction_for_winner(uuid, uuid, decimal) TO service_role;
GRANT EXECUTE ON FUNCTION complete_auction_for_winner(uuid, uuid, decimal) TO authenticated;

-- Realtime for auction table
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- Storage bucket
-- =====================================================

CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert a sample product
INSERT INTO products (name, variant, description, condition, contents, retail_price, shipping_time, shipping_method, returns_policy)
VALUES (
  'PlayStation 5 Console',
  'Disc Edition · 825GB',
  'The PS5 console unleashes new gaming possibilities that you never anticipated.',
  'New, Factory Sealed',
  '["PS5 Console (Disc Edition)", "DualSense Wireless Controller", "HDMI Cable & Power Cable", "USB Cable & Documentation", "Original Box & Packaging", "12 Month Sony Warranty"]'::jsonb,
  799.00,
  '7-14 business days (AU)',
  'Australia Post with tracking',
  '7 days DOA only'
);

COMMENT ON SCHEMA public IS 'ChickenBids MVP Database Schema';

