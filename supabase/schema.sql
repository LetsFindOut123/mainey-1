-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

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

-- Projects
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  creator_id uuid references profiles(id) on delete set null,
  status text default 'draft',
  created_at timestamp default now()
);

-- Gigs
create table if not exists gigs (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  budget numeric,
  city text,
  organizer_id uuid references profiles(id) on delete set null,
  created_at timestamp default now()
);

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
