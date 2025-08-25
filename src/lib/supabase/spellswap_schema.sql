-- CardSwap Database Schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  location_name VARCHAR(255), -- City, State format
  location_coordinates GEOGRAPHY(POINT, 4326), -- PostGIS for location-based queries
  bio TEXT,
  avatar_url TEXT,
  phone VARCHAR(20),
  preferred_contact_method VARCHAR(20) DEFAULT 'message', -- 'message', 'phone', 'email'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User ratings/reviews aggregate
CREATE TABLE user_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_reviews INTEGER DEFAULT 0,
  recommend_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  not_recommend_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00, -- calculated field
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- This script creates a table optimized for PostgreSQL to store card data,
-- likely from a source like the Scryfall API. It utilizes the JSONB data
-- type for improved performance and indexing capabilities on JSON data.
-- The primary key is set to 'id', which is a unique identifier for each card printing.

CREATE TABLE default_cards (
    -- Core Card Identifiers
    id UUID PRIMARY KEY,
    oracle_id UUID,
    object VARCHAR(50), -- e.g., 'card', 'error'
    mtgo_id INT,
    mtgo_foil_id INT,
    arena_id INT,
    tcgplayer_id INT,
    cardmarket_id INT,

    -- Core Card Details
    name VARCHAR(255) NOT NULL,
    lang VARCHAR(10) NOT NULL,
    released_at DATE,
    mana_cost VARCHAR(100),
    cmc DECIMAL(10, 2), -- Converted Mana Cost
    type_line VARCHAR(255),
    oracle_text TEXT,
    power VARCHAR(10), -- Using VARCHAR to accommodate values like '*', 'X', '1+*'
    toughness VARCHAR(10), -- Using VARCHAR for the same reason as 'power'
    flavor_text TEXT,

    -- Gameplay Properties
    reserved BOOLEAN,
    legalities JSONB, -- Using JSONB for efficient querying and indexing of JSON data in PostgreSQL.
    games JSONB, -- e.g., ['paper', 'arena', 'mtgo']
    multiverse_ids JSONB,
    keywords JSONB, -- e.g., ['Flying', 'Vigilance']
    produced_mana JSONB, -- e.g., ['W', 'U']
    edhrec_rank INT,
    penny_rank INT,
    game_changer BOOLEAN,

    -- Set and Printing Information
    set_id UUID,
    "set" VARCHAR(10) NOT NULL, -- "set" is a reserved keyword in SQL, so it's quoted.
    set_name VARCHAR(255),
    set_type VARCHAR(50),
    set_uri TEXT,
    set_search_uri TEXT,
    scryfall_set_uri TEXT,
    collector_number VARCHAR(20),
    reprint BOOLEAN,
    variation BOOLEAN,
    digital BOOLEAN,
    rarity VARCHAR(20), -- e.g., 'common', 'uncommon', 'rare', 'mythic'

    -- Finishes and Variants
    foil BOOLEAN,
    nonfoil BOOLEAN,
    oversized BOOLEAN,
    promo BOOLEAN,
    textless BOOLEAN,
    full_art BOOLEAN,
    story_spotlight BOOLEAN,
    booster BOOLEAN,
    finishes JSONB,

    -- Card Appearance
    layout VARCHAR(50),
    frame VARCHAR(20),
    border_color VARCHAR(20),
    card_back_id UUID,
    artist VARCHAR(255),
    artist_ids JSONB,
    illustration_id UUID,

    -- Color Information
    colors JSONB, -- e.g., ['W', 'U']
    color_identity JSONB, -- e.g., ['W', 'U']

    -- URIs and Image Status
    uri TEXT,
    scryfall_uri TEXT,
    highres_image BOOLEAN,    
    image_status VARCHAR(50),
    image_uris TEXT,
    related_uris JSONB,
    prints_search_uri TEXT,
    rulings_uri TEXT,
    

    -- Pricing Data
    prices JSONB, -- e.g., {'usd': '0.10', 'usd_foil': '0.25'}
    purchase_uri TEXT
);

-- Optional: For even faster searches within the JSONB columns, you can create GIN indexes.
-- For example, to quickly find cards with a specific keyword:
-- CREATE INDEX idx_cards_keywords_gin ON cards USING GIN (keywords);
-- To find cards that are legal in a specific format:
-- CREATE INDEX idx_cards_legalities_gin ON cards USING GIN (legalities);

-- Card pricing history
CREATE TABLE card_prices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_id UUID REFERENCES default_cards(id) ON DELETE CASCADE,
  price_date DATE NOT NULL,
  market_price DECIMAL(10,2),
  low_price DECIMAL(10,2),
  mid_price DECIMAL(10,2),
  high_price DECIMAL(10,2),
  source VARCHAR(50) DEFAULT 'tcgplayer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, price_date, source)
);

-- User containers (decks, binders, custom)
CREATE TABLE containers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  container_type VARCHAR(50) NOT NULL, -- 'deck', 'binder', 'custom'
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'local', 'public'
  is_default BOOLEAN DEFAULT false, -- for unorganized cards
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User card collection
-- Each row represents a stack of identical cards owned by a user.
-- The `container_items` table determines where these cards are located.
CREATE TABLE user_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES default_cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition VARCHAR(20) DEFAULT 'near_mint', -- 'mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor'
  foil BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'english',
  notes TEXT,
  is_for_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensures a user has only one record for each unique card version (card, condition, foil, lang)
  UNIQUE(user_id, card_id, condition, foil, language)
);

-- Join table to link user cards to containers (many-to-many relationship)
CREATE TABLE container_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE,
  container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_card_id, container_id)
);



-- User wishlist
CREATE TABLE wishlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES default_cards(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  max_price DECIMAL(10,2), -- maximum price user is willing to pay
  preferred_condition VARCHAR(20) DEFAULT 'near_mint',
  foil_preference VARCHAR(20) DEFAULT 'any', -- 'foil', 'non_foil', 'any'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Transactions/trades
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled'
  total_amount DECIMAL(10,2),
  meeting_location VARCHAR(255),
  meeting_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction items (cards being traded)
CREATE TABLE transaction_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_card_id UUID REFERENCES user_cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  agreed_price DECIMAL(10,2) NOT NULL,
  condition VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction reviews
CREATE TABLE transaction_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating VARCHAR(20) NOT NULL, -- 'recommend', 'neutral', 'not_recommend'
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  card_condition_rating INTEGER CHECK (card_condition_rating >= 1 AND card_condition_rating <= 5),
  overall_experience_rating INTEGER CHECK (overall_experience_rating >= 1 AND overall_experience_rating <= 5),
  comments TEXT,
  would_trade_again BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id, reviewer_id)
);

-- Messages between users
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  participant1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id)
);

CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price alerts for wishlist items
CREATE TABLE price_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_id UUID REFERENCES default_cards(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL, -- 'price_drop', 'price_increase', 'available_locally'
  threshold_price DECIMAL(10,2),
  threshold_percentage INTEGER, -- for percentage-based alerts
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity log for analytics
CREATE TABLE user_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'card_added', 'card_sold', 'trade_completed', etc.
  description TEXT,
  metadata JSONB, -- flexible field for additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_location ON profiles USING GIST (location_coordinates);
CREATE INDEX idx_profiles_username ON profiles (username);
CREATE INDEX idx_default_cards_name ON default_cards (name);
CREATE INDEX idx_default_cards_set ON default_cards ("set");
CREATE INDEX idx_default_cards_collector_number ON default_cards (collector_number);
CREATE INDEX idx_default_cards_oracle_id ON default_cards (oracle_id);
CREATE INDEX idx_default_cards_tcgplayer_id ON default_cards (tcgplayer_id);
CREATE INDEX idx_card_prices_card_date ON card_prices (card_id, price_date DESC);
CREATE INDEX idx_user_cards_user_id ON user_cards (user_id);
CREATE INDEX idx_user_cards_card_id ON user_cards (card_id);
CREATE INDEX idx_user_cards_for_sale ON user_cards (is_for_sale) WHERE is_for_sale = true;
CREATE INDEX idx_wishlist_user_id ON wishlist_items (user_id);
CREATE INDEX idx_transactions_buyer_seller ON transactions (buyer_id, seller_id);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_containers_user_id ON containers (user_id);
CREATE INDEX idx_container_items_user_card_id ON container_items (user_card_id);
CREATE INDEX idx_container_items_container_id ON container_items (container_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you'll need to customize these based on your specific requirements)
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own containers" ON containers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public containers" ON containers FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can manage items in their own containers"
  ON container_items
  FOR ALL
  USING (auth.uid() = (SELECT user_id FROM containers WHERE id = container_id));

CREATE POLICY "Users can manage their own cards" ON user_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view cards for sale" ON user_cards FOR SELECT USING (is_for_sale = true);

CREATE POLICY "Users can manage their own wishlist" ON wishlist_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view transactions they're involved in" ON transactions 
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages RLS Policies
-- Updated to support marking messages as read functionality

-- SELECT: Users can view messages in conversations they're involved in
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- INSERT: Users can send messages in conversations they're involved in
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    ) AND
    auth.uid() = sender_id
  );

-- UPDATE: Users can update messages in conversations they're involved in
-- This is crucial for marking messages as read - users need to update messages from other participants
CREATE POLICY "Users can update messages in their conversations" ON messages
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- DELETE: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_user_rating(user_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_ratings (user_id, total_reviews, recommend_count, neutral_count, not_recommend_count, average_rating)
  SELECT 
    user_uuid,
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 'recommend'),
    COUNT(*) FILTER (WHERE rating = 'neutral'),
    COUNT(*) FILTER (WHERE rating = 'not_recommend'),
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (
        COUNT(*) FILTER (WHERE rating = 'recommend') * 5.0 +
        COUNT(*) FILTER (WHERE rating = 'neutral') * 3.0 +
        COUNT(*) FILTER (WHERE rating = 'not_recommend') * 1.0
      ) / COUNT(*)
    END
  FROM transaction_reviews 
  WHERE reviewed_user_id = user_uuid
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    recommend_count = EXCLUDED.recommend_count,
    neutral_count = EXCLUDED.neutral_count,
    not_recommend_count = EXCLUDED.not_recommend_count,
    average_rating = EXCLUDED.average_rating,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user ratings when reviews are added
CREATE OR REPLACE FUNCTION trigger_update_user_rating()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_rating(NEW.reviewed_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_after_review
  AFTER INSERT OR UPDATE ON transaction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_rating();

-- Function to create default container for new users
CREATE OR REPLACE FUNCTION create_default_container()
RETURNS trigger AS $$
BEGIN
  INSERT INTO containers (user_id, name, container_type, is_default)
  VALUES (NEW.id, 'Unorganized Cards', 'custom', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_container_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_container();

-- Create the increment_card_quantity function
CREATE OR REPLACE FUNCTION increment_card_quantity(
    p_card_id UUID,
    p_user_id UUID,
    p_condition card_condition,
    p_foil BOOLEAN,
    p_language card_language,
    p_quantity_to_add INT
)
RETURNS VOID AS $$
DECLARE
    v_user_card_id UUID;
    v_container_id UUID;
BEGIN
    -- Find the corresponding user_card and its container
    SELECT uc.id, ci.container_id
    INTO v_user_card_id, v_container_id
    FROM user_cards uc
    JOIN container_items ci ON uc.id = ci.user_card_id
    WHERE uc.card_id = p_card_id
      AND uc.user_id = p_user_id
      AND uc.condition = p_condition
      AND uc.foil = p_foil
      AND uc.language = p_language
    LIMIT 1;

    -- If a matching card is found, increment its quantity
    IF v_user_card_id IS NOT NULL THEN
        -- Increment quantity in user_cards
        UPDATE user_cards
        SET quantity = quantity + p_quantity_to_add
        WHERE id = v_user_card_id;

        -- Also increment quantity in container_items
        UPDATE container_items
        SET quantity = quantity + p_quantity_to_add
        WHERE user_card_id = v_user_card_id AND container_id = v_container_id;
    ELSE
        RAISE EXCEPTION 'No existing card found to increment for user_id: %, card_id: %', p_user_id, p_card_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";