-- KUN TAKLIFLARI: new database schema / old FORMA 3D upgrade (safe to re-run).
create table if not exists public.daily_offers (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 active boolean not null default true,
 original_price numeric(12,2) not null,
 offer_price numeric(12,2) not null,
 created_at timestamptz not null default now(),
 constraint daily_offer_valid_dates check (ends_at>starts_at),
 constraint daily_offer_price_valid check (offer_price>0 and offer_price<original_price)
);
create index if not exists daily_offers_current_idx on public.daily_offers(active,starts_at,ends_at);
create index if not exists daily_offers_product_idx on public.daily_offers(product_id);
alter table public.daily_offers enable row level security;
-- Daily offers are accessed only by server-side routes via service role.
