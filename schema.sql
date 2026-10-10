-- FloorPlan Studio: run this once in the Neon SQL Editor.
create extension if not exists pgcrypto;

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text not null,
  pw_hash    text not null,
  role       text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  event      text,
  venue      text,
  client     text,
  ref        text,
  created_by uuid references users(id),
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every save is a new revision; nothing is overwritten, so you keep an audit trail for EMS submissions.
create table if not exists plan_revisions (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references plans(id) on delete cascade,
  rev_no     int  not null,
  label      text,
  note       text,
  data       jsonb not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (plan_id, rev_no)
);

-- Aerial / client-plan images (JPEG, max ~4 MB each). Move to object storage later if you outgrow 0.5 GB.
create table if not exists plan_images (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  mime       text not null,
  bytes      bytea not null,
  size       int  not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists plans_updated_idx on plans (updated_at desc) where not archived;
create index if not exists rev_plan_idx on plan_revisions (plan_id, rev_no desc);

-- Venue library (added Oct 2026). api/venues.js also creates these on first use, so running this is optional.
create table if not exists venues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  area       text,
  lat        double precision,
  lon        double precision,
  archived   boolean not null default false,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists venue_maps (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references venues(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('sat','plan')),
  image_id    uuid not null references plan_images(id),
  mpp         double precision not null check (mpp > 0),
  rot         double precision not null default 0,
  geo         jsonb,
  captured_on date,
  note        text,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);
create index if not exists venue_maps_venue_idx on venue_maps (venue_id, created_at desc);
