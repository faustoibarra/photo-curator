-- Update collection types to match spec:
-- 'nature trip' | 'city trip' | 'sports' | 'social event'

-- Drop old check constraint
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_type_check;

-- Migrate existing data to new types
UPDATE collections SET type = 'nature trip'  WHERE type = 'trip';
UPDATE collections SET type = 'social event' WHERE type = 'event';
UPDATE collections SET type = 'nature trip'  WHERE type = 'project';

-- Update default and add new check constraint
ALTER TABLE collections
  ALTER COLUMN type SET DEFAULT 'nature trip',
  ADD CONSTRAINT collections_type_check
    CHECK (type IN ('nature trip', 'city trip', 'sports', 'social event'));
