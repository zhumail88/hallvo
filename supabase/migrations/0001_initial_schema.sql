-- Create profiles table linked to Auth users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text not null check (role in ('admin', 'staff')) default 'staff',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create halls table
create table public.halls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null,
  base_price numeric not null default 0,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create addons table
create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  pricing_type text not null check (pricing_type in ('per_guest', 'fixed')) default 'fixed',
  category text not null check (category in ('catering', 'decor', 'music', 'other')) default 'other',
  is_active boolean not null default true
);

-- Create bookings table
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid references public.halls on delete cascade not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null check (status in ('inquiry', 'tentative', 'confirmed', 'completed', 'cancelled')) default 'inquiry',
  guests_count integer not null default 0,
  base_amount numeric not null default 0,
  addon_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  discount_reason text,
  final_amount numeric not null default 0,
  advance_paid numeric not null default 0,
  notes text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create booking_addons junction table
create table public.booking_addons (
  booking_id uuid references public.bookings on delete cascade not null,
  addon_id uuid references public.addons on delete cascade not null,
  unit_price numeric not null default 0,
  quantity integer not null default 1,
  total_price numeric not null default 0,
  primary key (booking_id, addon_id)
);

-- Create receipts table
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade not null,
  receipt_number text not null unique,
  amount_paid numeric not null default 0,
  payment_method text not null check (payment_method in ('cash', 'card', 'bank_transfer', 'mobile_wallet')) default 'cash',
  pdf_storage_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  created_by uuid references public.profiles on delete set null
);

-- Create activity_logs table
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete cascade,
  user_id uuid references public.profiles on delete set null,
  action text not null check (action in ('created', 'status_changed', 'details_updated', 'payment_added', 'cancelled')),
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on all public tables
alter table public.profiles enable row level security;
alter table public.halls enable row level security;
alter table public.addons enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_addons enable row level security;
alter table public.receipts enable row level security;
alter table public.activity_logs enable row level security;

-- Create RLS Policies

-- Profiles:
-- Logged in users can view all profiles (needed to see who created bookings)
create policy "Users can view all profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Users can edit their own profile
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Admins can do anything with profiles
create policy "Admins have full access to profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Halls:
-- Authenticated users can read halls
create policy "Authenticated users can read halls" on public.halls
  for select using (auth.role() = 'authenticated');

-- Only admins can modify halls
create policy "Admins can modify halls" on public.halls
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Addons:
-- Authenticated users can read addons
create policy "Authenticated users can read addons" on public.addons
  for select using (auth.role() = 'authenticated');

-- Only admins can modify addons
create policy "Admins can modify addons" on public.addons
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Bookings:
-- Authenticated users can read bookings
create policy "Authenticated users can read bookings" on public.bookings
  for select using (auth.role() = 'authenticated');

-- Authenticated users can create bookings
create policy "Authenticated users can insert bookings" on public.bookings
  for insert with check (auth.role() = 'authenticated');

-- Authenticated users can update bookings
create policy "Authenticated users can update bookings" on public.bookings
  for update using (auth.role() = 'authenticated');

-- Booking Addons:
-- Authenticated users can read booking addons
create policy "Authenticated users can read booking addons" on public.booking_addons
  for select using (auth.role() = 'authenticated');

-- Authenticated users can modify booking addons
create policy "Authenticated users can write booking addons" on public.booking_addons
  for all using (auth.role() = 'authenticated');

-- Receipts:
-- Authenticated users can read receipts
create policy "Authenticated users can read receipts" on public.receipts
  for select using (auth.role() = 'authenticated');

-- Authenticated users can insert receipts
create policy "Authenticated users can insert receipts" on public.receipts
  for insert with check (auth.role() = 'authenticated');

-- Activity Logs:
-- Authenticated users can read activity logs
create policy "Authenticated users can read activity logs" on public.activity_logs
  for select using (auth.role() = 'authenticated');

-- Authenticated users can insert activity logs
create policy "Authenticated users can insert activity logs" on public.activity_logs
  for insert with check (auth.role() = 'authenticated');


-- Trigger for handling updated_at on profiles and bookings
create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_update_timestamp();

create trigger on_booking_updated
  before update on public.bookings
  for each row execute procedure public.handle_update_timestamp();


-- Trigger to automatically create a profile for new auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
