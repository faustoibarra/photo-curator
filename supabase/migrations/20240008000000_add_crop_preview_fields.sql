-- Add crop preview and edit adjustment fields to photos table
-- ai_crop_coords: structured crop coordinates from Claude (proportions 0-1)
-- ai_edit_adjustments: structured tone adjustment values from Claude
-- user_crop_coords: user-accepted or manually adjusted crop
-- original_width/height: pixel dimensions captured at analysis time (for PS script)

alter table photos
  add column ai_crop_coords jsonb default null,
  add column ai_edit_adjustments jsonb default null,
  add column user_crop_coords jsonb default null,
  add column original_width integer default null,
  add column original_height integer default null;
