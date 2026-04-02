-- Add A+ as a valid ai_tier value
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_ai_tier_check;
ALTER TABLE photos ADD CONSTRAINT photos_ai_tier_check CHECK (ai_tier IN ('A+', 'A', 'B', 'C'));
