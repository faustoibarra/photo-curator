alter table photos
  add column if not exists ai_curator_score numeric,
  add column if not exists ai_stranger_score numeric,
  add column if not exists ai_social_score numeric;
