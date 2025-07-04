-- Drop triggers first
DROP TRIGGER IF EXISTS update_rating_after_review ON transaction_reviews;
DROP TRIGGER IF EXISTS create_default_container_trigger ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_update_user_rating();
DROP FUNCTION IF EXISTS create_default_container();
DROP FUNCTION IF EXISTS update_user_rating(UUID);

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS price_alerts;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS transaction_reviews;
DROP TABLE IF EXISTS transaction_items;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS user_cards;
DROP TABLE IF EXISTS containers;
DROP TABLE IF EXISTS card_prices;

-- Disable RLS policies (optional, will be dropped with tables)
ALTER TABLE user_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE containers DISABLE ROW LEVEL SECURITY; 