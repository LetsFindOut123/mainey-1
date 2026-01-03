-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Users & profiles
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  type text, -- musician, filmmaker, etc.
  city text,
  socials jsonb,
  created_at timestamp default now()
);

-- Posts / feed
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamp default now()
);

-- Feed MVP (v1): public read, authenticated post
-- Uses auth.users directly (does not require profiles row).
create table if not exists feed_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists feed_posts_created_at_idx on feed_posts (created_at desc);

alter table feed_posts enable row level security;

create policy "Public read feed_posts"
on feed_posts for select
using (true);

create policy "Authenticated insert feed_posts"
on feed_posts for insert
with check (auth.uid() = author_id);

create policy "Author update feed_posts"
on feed_posts for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Author delete feed_posts"
on feed_posts for delete
using (auth.uid() = author_id);

-- Projects
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  creator_id uuid references profiles(id) on delete set null,
  status text default 'draft',
  created_at timestamp default now()
);

-- Gigs MVP (v1): public read, authenticated create/edit + applications
-- NOTE: This replaces the earlier scaffold 'gigs' table shape.
drop table if exists gig_applications;
drop table if exists gigs;

create table gigs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null,
  description text not null,
  location text,
  starts_at timestamptz,
  created_at timestamptz default now()
);

create index gigs_created_at_idx on gigs (created_at desc);

alter table gigs enable row level security;

create policy "Public read gigs"
on gigs for select
using (true);

create policy "Authenticated insert gigs"
on gigs for insert
with check (auth.uid() = owner_id);

create policy "Owner update gigs"
on gigs for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owner delete gigs"
on gigs for delete
using (auth.uid() = owner_id);

create table gig_applications (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references gigs(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  note text,
  created_at timestamptz default now(),
  unique (gig_id, user_id)
);

create index gig_applications_gig_id_idx on gig_applications (gig_id);
create index gig_applications_user_id_idx on gig_applications (user_id);

alter table gig_applications enable row level security;

create policy "Applicant read own applications"
on gig_applications for select
using (auth.uid() = user_id);

create policy "Gig owner read applications"
on gig_applications for select
using (
  auth.uid() in (
    select owner_id from gigs where gigs.id = gig_applications.gig_id
  )
);

create policy "Authenticated insert applications"
on gig_applications for insert
with check (auth.uid() = user_id);

-- Events (for calendar)
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text,
  date date,
  location text,
  description text,
  organizer_id uuid references profiles(id) on delete set null,
  created_at timestamp default now()
);

-- Companies
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  base_city text,
  members uuid[], -- array of profile ids (can normalize later)
  created_at timestamp default now()
);

-- Spaces (venues, studios)
create table if not exists spaces (
  id uuid primary key default uuid_generate_v4(),
  name text,
  address text,
  city text,
  capacity int,
  contact text,
  created_at timestamp default now()
);

-- Fundraisers
create table if not exists fundraisers (
  id uuid primary key default uuid_generate_v4(),
  title text,
  goal numeric,
  raised numeric default 0,
  description text,
  creator_id uuid references profiles(id) on delete set null,
  created_at timestamp default now()
);

-- Marketplace items
create table if not exists marketplace_items (
  id uuid primary key default uuid_generate_v4(),
  title text,
  price numeric,
  description text,
  seller_id uuid references profiles(id) on delete set null,
  created_at timestamp default now()
);
