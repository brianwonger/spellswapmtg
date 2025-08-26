-- Create a new ENUM type for transaction statuses to ensure data integrity
CREATE TYPE transaction_status AS ENUM ('open', 'pending', 'accepted', 'completed', 'cancelled');

-- Alter the 'transactions' table to use the new ENUM type for the 'status' column
-- This change also updates the default value for new transactions to 'open'
-- The USING clause converts existing string values to the new enum type
ALTER TABLE transactions 
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE transaction_status USING status::transaction_status,
    ALTER COLUMN status SET DEFAULT 'open';
