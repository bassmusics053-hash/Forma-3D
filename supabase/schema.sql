-- FORMA 3D, yangi BO'SH Supabase loyihasi uchun sxema.
-- Agar oldin SQL Editor'da jadvallarni yaratgan bo'lsangiz qayta ishlatmang:
-- faqat forma3d-products-upgrade.sql ni bajaring.
create extension if not exists pgcrypto;

create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null, slug text not null unique, description text,
 image_url text, parent_id uuid references public.categories(id) on delete set null,
 show_on_home boolean not null default true, sort_order integer not null default 0,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null, slug text not null unique, sku text unique,
 category_id uuid references public.categories(id) on delete set null,
 category text, price numeric(14,2) not null default 0,
 old_price numeric(14,2), stock integer not null default 0,
 description text, image_url text, images text[] not null default '{}',
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.product_sizes (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 label text not null, price numeric(14,2) not null check (price>0),
 sort_order integer not null default 0, unique(product_id,label)
);
create table if not exists public.product_colors (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 name text not null,hex_code text not null check(hex_code ~ '^#[0-9a-fA-F]{6}$'),
 swatch_colors text[] not null default '{}',
 available boolean not null default true,sort_order integer not null default 0,
 unique(product_id,name)
);
create table if not exists public.settings (
 id integer primary key default 1,
 telegram_url text,instagram_url text,phone text,google_maps_url text,apple_maps_url text,
 updated_at timestamptz default now()
);
insert into public.settings(id) values (1) on conflict(id) do nothing;
create sequence if not exists public.forma3d_order_numbers;
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number bigint not null unique default nextval('public.forma3d_order_numbers'),
 customer_name text not null,phone text not null,
 region text not null,district text not null,address text not null,
 customer_note text,total_amount numeric(14,2) not null,
 status text not null default 'new',
 created_at timestamptz default now(),updated_at timestamptz default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,product_slug text,image_url text,
 size_id uuid references public.product_sizes(id) on delete set null,
 color_id uuid references public.product_colors(id) on delete set null,
 size_label text,color_name text,
 price numeric(14,2) not null,quantity integer not null,
 subtotal numeric(14,2) not null,created_at timestamptz default now()
);
create table if not exists public.telegram_verifications (
 id uuid primary key default gen_random_uuid(),phone text not null,
 code_hash text,status text default 'waiting_start',attempts integer default 0,
 expires_at timestamptz not null,verified_at timestamptz,used_at timestamptz,
 telegram_chat_id bigint,telegram_user_id bigint,telegram_username text,
 order_id uuid references public.orders(id) on delete set null,
 created_at timestamptz default now()
);
create table if not exists public.product_events (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 visitor_id text not null,
 event_type text not null check(event_type in ('view','buy_now','add_to_cart')),
 created_at timestamptz default now()
);
create index if not exists idx_product_events_type_date
 on public.product_events(event_type,created_at desc);
create index if not exists idx_product_events_product_date
 on public.product_events(product_id,created_at desc);
create or replace view public.product_interest_stats as
select p.id as product_id,p.name,p.image_url,
 count(e.id) filter(where e.event_type='view')::integer as views_total,
 count(e.id) filter(where e.event_type='view' and e.created_at>=now()-interval '7 days')::integer as views_7d,
 count(e.id) filter(where e.event_type='view' and e.created_at>=now()-interval '30 days')::integer as views_30d,
 count(distinct e.visitor_id) filter(where e.event_type='view')::integer as unique_visitors,
 count(e.id) filter(where e.event_type='buy_now')::integer as buy_now_total,
 count(e.id) filter(where e.event_type='buy_now' and e.created_at>=now()-interval '7 days')::integer as buy_now_7d,
 count(e.id) filter(where e.event_type='buy_now' and e.created_at>=now()-interval '30 days')::integer as buy_now_30d
from public.products p left join public.product_events e on e.product_id=p.id group by p.id;
create table if not exists public.daily_offers (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.products(id) on delete cascade,
 starts_at timestamptz not null default now(), ends_at timestamptz not null,
 active boolean not null default true,
 original_price numeric(14,2) not null, offer_price numeric(14,2) not null,
 created_at timestamptz default now(),
 constraint daily_offer_dates check (ends_at>starts_at),
 constraint daily_offer_discount check (offer_price>0 and offer_price<original_price)
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_colors enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.telegram_verifications enable row level security;
alter table public.product_events enable row level security;
alter table public.daily_offers enable row level security;

create policy "Public categories" on public.categories for select to anon,authenticated using (active=true);
create policy "Public products" on public.products for select to anon,authenticated using(active=true);
create policy "Public sizes" on public.product_sizes for select to anon,authenticated
 using(exists(select 1 from public.products p where p.id=product_id and p.active=true));
create policy "Public colors" on public.product_colors for select to anon,authenticated
 using(exists(select 1 from public.products p where p.id=product_id and p.active=true));
create policy "Public settings" on public.settings for select to anon,authenticated using(true);
revoke all on public.product_interest_stats from anon,authenticated;

insert into public.categories (name,slug,description,sort_order) values
('Shaxmat','chess','3D shaxmat to‘plamlari',1),
('Stendlar','stands','Telefon va gadjet stendlari',2),
('Dekor','decor','Dekorativ 3D mahsulotlar',3),
('Figuralar','figures','3D figuralar',4),
('Aksessuarlar','accessories','3D aksessuarlar',5),
('Maxsus buyurtmalar','custom','Individual dizayn',6)
on conflict(slug) do nothing;
-- BU FAYLDAN KEYIN forma3d-products-upgrade.sql HAM BAJARILSIN.
