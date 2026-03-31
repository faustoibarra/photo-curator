-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COLLECTIONS
-- ============================================================
CREATE TABLE collections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users NOT NULL,
  name           text NOT NULL,
  description    text,
  cover_photo_id uuid, -- FK to photos, added via ALTER after photos table
  type           text DEFAULT 'trip' CHECK (type IN ('trip', 'event', 'project')),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ============================================================
-- PHOTOS
-- ============================================================
CREATE TABLE photos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id         uuid REFERENCES collections NOT NULL,
  user_id               uuid REFERENCES auth.users NOT NULL,
  filename              text NOT NULL,
  storage_path          text NOT NULL,
  storage_url           text NOT NULL,
  file_size             integer,
  width                 integer,
  height                integer,
  -- AI Analysis fields
  ai_title              text,
  ai_caption            text,
  ai_overall_rating     numeric(3,1) CHECK (ai_overall_rating BETWEEN 1.0 AND 10.0),
  ai_technical_rating   numeric(3,1) CHECK (ai_technical_rating BETWEEN 1.0 AND 10.0),
  ai_composition_rating numeric(3,1) CHECK (ai_composition_rating BETWEEN 1.0 AND 10.0),
  ai_light_rating       numeric(3,1) CHECK (ai_light_rating BETWEEN 1.0 AND 10.0),
  ai_impact_rating      numeric(3,1) CHECK (ai_impact_rating BETWEEN 1.0 AND 10.0),
  ai_print_rating       numeric(3,1) CHECK (ai_print_rating BETWEEN 1.0 AND 10.0),
  ai_bw_rating          numeric(3,1) CHECK (ai_bw_rating BETWEEN 1.0 AND 10.0),
  ai_tier               text CHECK (ai_tier IN ('A', 'B', 'C')),
  ai_critique           text,
  ai_crop_suggestion    text,
  ai_bw_rationale       text,
  ai_tags               text[],
  ai_analyzed_at        timestamptz,
  -- User fields
  user_rating           integer CHECK (user_rating BETWEEN 1 AND 5),
  user_notes            text,
  user_flagged          boolean DEFAULT false,
  uploaded_at           timestamptz DEFAULT now(),
  sort_order            integer DEFAULT 0
);

-- Add the self-referential FK for cover_photo_id now that photos table exists
ALTER TABLE collections
  ADD CONSTRAINT collections_cover_photo_id_fkey
  FOREIGN KEY (cover_photo_id) REFERENCES photos (id) ON DELETE SET NULL;

-- ============================================================
-- SUB_COLLECTIONS
-- ============================================================
CREATE TABLE sub_collections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id         uuid REFERENCES collections NOT NULL,
  user_id               uuid REFERENCES auth.users NOT NULL,
  name                  text NOT NULL,
  description           text,
  color                 text,
  is_best_of            boolean DEFAULT false,
  best_of_generated_at  timestamptz,
  best_of_config        jsonb,
  share_token           text UNIQUE,
  share_enabled         boolean DEFAULT false,
  share_allow_downloads boolean DEFAULT false,
  share_created_at      timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- ============================================================
-- SUB_COLLECTION_PHOTOS
-- ============================================================
CREATE TABLE sub_collection_photos (
  sub_collection_id uuid REFERENCES sub_collections NOT NULL,
  photo_id          uuid REFERENCES photos NOT NULL,
  added_at          timestamptz DEFAULT now(),
  score             numeric(4,2),
  score_breakdown   jsonb,
  PRIMARY KEY (sub_collection_id, photo_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_collections_user_id ON collections (user_id);
CREATE INDEX idx_photos_collection_id ON photos (collection_id);
CREATE INDEX idx_photos_user_id ON photos (user_id);
CREATE INDEX idx_photos_ai_tier ON photos (ai_tier);
CREATE INDEX idx_photos_ai_overall_rating ON photos (ai_overall_rating DESC);
CREATE INDEX idx_photos_ai_analyzed_at ON photos (ai_analyzed_at);
CREATE INDEX idx_sub_collections_collection_id ON sub_collections (collection_id);
CREATE INDEX idx_sub_collections_user_id ON sub_collections (user_id);
CREATE INDEX idx_sub_collections_share_token ON sub_collections (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_sub_collection_photos_photo_id ON sub_collection_photos (photo_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_collection_photos ENABLE ROW LEVEL SECURITY;

-- Collections: owners only
CREATE POLICY "collections_select_own" ON collections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "collections_insert_own" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collections_update_own" ON collections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "collections_delete_own" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- Photos: owners only
CREATE POLICY "photos_select_own" ON photos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "photos_insert_own" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photos_update_own" ON photos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "photos_delete_own" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Sub-collections: owners + public read via share_token
CREATE POLICY "sub_collections_select_own" ON sub_collections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sub_collections_select_public_share" ON sub_collections
  FOR SELECT USING (share_enabled = true AND share_token IS NOT NULL);
CREATE POLICY "sub_collections_insert_own" ON sub_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub_collections_update_own" ON sub_collections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sub_collections_delete_own" ON sub_collections
  FOR DELETE USING (auth.uid() = user_id);

-- Sub-collection photos: owners, plus public read when sub-collection is shared
CREATE POLICY "sub_collection_photos_select_own" ON sub_collection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sub_collections sc
      WHERE sc.id = sub_collection_id AND sc.user_id = auth.uid()
    )
  );
CREATE POLICY "sub_collection_photos_select_public_share" ON sub_collection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sub_collections sc
      WHERE sc.id = sub_collection_id
        AND sc.share_enabled = true
        AND sc.share_token IS NOT NULL
    )
  );
CREATE POLICY "sub_collection_photos_insert_own" ON sub_collection_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sub_collections sc
      WHERE sc.id = sub_collection_id AND sc.user_id = auth.uid()
    )
  );
CREATE POLICY "sub_collection_photos_delete_own" ON sub_collection_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sub_collections sc
      WHERE sc.id = sub_collection_id AND sc.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE
-- ============================================================

-- Create the public photos bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own prefix
CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (bucket is public, but explicit policy is good practice)
CREATE POLICY "Public read access to photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'photos');
