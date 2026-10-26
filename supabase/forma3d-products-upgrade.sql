-- FORMA 3D / yangi mahsulot formasi (mavjud bazaga, bir marta)
-- Mavjud mahsulotlarni va kategoriyalarni o'chirmaydi.
create extension if not exists pgcrypto;

alter table public.product_colors
  add column if not exists swatch_colors text[] not null default '{}'::text[];

-- Mahsulot, o'lcham va rang kombinatsiyalarini BIR TRANSAKSIYADA saqlash.
-- Ushbu funksiya FAQAT serverdagi service_role tomonidan chaqiriladi.
create or replace function public.forma_save_product(
  p_product jsonb, p_sizes jsonb, p_colors jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_cat uuid;
  v_name text;
  v_slug text;
  v_sku text;
  v_cat_name text;
  v_price numeric;
  v_row jsonb;
  v_child_id uuid;
  v_kept_sizes uuid[] := '{}'::uuid[];
  v_kept_colors uuid[] := '{}'::uuid[];
  v_label text;
  v_colors text[];
  v_hex text;
  v_available boolean;
  v_idx integer := 0;
begin
  v_name := trim(coalesce(p_product->>'name',''));
  v_slug := trim(coalesce(p_product->>'slug',''));
  v_sku := upper(trim(coalesce(p_product->>'sku','')));
  if char_length(v_name) < 2 or char_length(v_name) > 150 then
    raise exception 'Mahsulot nomini kiriting (2–150 belgi)';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Slug faqat lotin harflari, raqamlar va defisdan iborat bo‘lsin';
  end if;
  if v_sku !~ '^[A-Z0-9][A-Z0-9_-]{1,63}$' then
    raise exception 'SKU kamida 2 belgi: lotin harfi, raqam, defis yoki _';
  end if;
  begin
    v_cat := (p_product->>'category_id')::uuid;
  exception when others then
    raise exception 'Kategoriya tanlang';
  end;
  select name into v_cat_name from public.categories where id = v_cat;
  if v_cat_name is null then raise exception 'Kategoriya topilmadi'; end if;
  if jsonb_typeof(p_sizes) <> 'array' or jsonb_array_length(p_sizes) < 1 then
    raise exception 'Kamida bitta o‘lcham va narx kiriting';
  end if;
  if jsonb_typeof(p_colors) <> 'array' or jsonb_array_length(p_colors) < 1 then
    raise exception 'Kamida bitta rang kombinatsiyasini kiriting';
  end if;
  select min((s->>'price')::numeric) into v_price from jsonb_array_elements(p_sizes) s;
  if v_price is null or v_price <= 0 then raise exception 'O‘lcham narxini kiriting'; end if;

  if coalesce(p_product->>'id','') <> '' then
    v_id := (p_product->>'id')::uuid;
    update public.products set
      name=v_name, slug=v_slug, sku=v_sku,
      category_id=v_cat, category=v_cat_name,
      price=v_price, old_price=null,
      description=nullif(trim(coalesce(p_product->>'description','')),''),
      image_url=nullif(trim(coalesce(p_product->>'image_url','')),''),
      images=coalesce(array(select jsonb_array_elements_text(coalesce(p_product->'images','[]'::jsonb))),'{}'::text[]),
      active=coalesce((p_product->>'active')::boolean,true)
    where id=v_id;
    if not found then raise exception 'Tahrirlanayotgan mahsulot topilmadi'; end if;
  else
    insert into public.products
      (name,slug,sku,category_id,category,price,stock,description,image_url,images,active)
    values
      (v_name,v_slug,v_sku,v_cat,v_cat_name,v_price,0,
       nullif(trim(coalesce(p_product->>'description','')),''),
       nullif(trim(coalesce(p_product->>'image_url','')),''),
       coalesce(array(select jsonb_array_elements_text(coalesce(p_product->'images','[]'::jsonb))),'{}'::text[]),
       coalesce((p_product->>'active')::boolean,true))
    returning id into v_id;
  end if;

  v_idx := 0;
  for v_row in select value from jsonb_array_elements(p_sizes) loop
    v_label := trim(coalesce(v_row->>'label',''));
    if v_label = '' or char_length(v_label)>60 or
       (v_row->>'price')::numeric <= 0 then
      raise exception 'O‘lcham yoki uning narxi noto‘g‘ri';
    end if;
    if nullif(v_row->>'id','') is not null then
      v_child_id := (v_row->>'id')::uuid;
      update public.product_sizes set label=v_label,
        price=(v_row->>'price')::numeric, sort_order=v_idx
      where id=v_child_id and product_id=v_id;
      if not found then raise exception 'O‘lcham mahsulotga tegishli emas'; end if;
    else
      insert into public.product_sizes (product_id,label,price,sort_order)
      values (v_id,v_label,(v_row->>'price')::numeric,v_idx)
      returning id into v_child_id;
    end if;
    v_kept_sizes := array_append(v_kept_sizes,v_child_id);
    v_idx := v_idx + 1;
  end loop;
  delete from public.product_sizes where product_id=v_id and not (id=any(v_kept_sizes));

  v_idx := 0;
  for v_row in select value from jsonb_array_elements(p_colors) loop
    v_label := trim(coalesce(v_row->>'name',''));
    v_colors := array(select jsonb_array_elements_text(coalesce(v_row->'swatch_colors','[]'::jsonb)));
    if cardinality(v_colors) < 1 or cardinality(v_colors) > 3 then
      raise exception 'Kombinatsiyada 1–3 ta rang belgilang';
    end if;
    foreach v_hex in array v_colors loop
      if v_hex !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Rang HEX qiymati noto‘g‘ri'; end if;
    end loop;
    if v_label='' or char_length(v_label)>100 then
      raise exception 'Rang kombinatsiyasi nomini kiriting';
    end if;
    v_available := coalesce((v_row->>'available')::boolean,true);
    if nullif(v_row->>'id','') is not null then
      v_child_id := (v_row->>'id')::uuid;
      update public.product_colors set name=v_label,hex_code=v_colors[1],
        swatch_colors=v_colors,available=v_available,sort_order=v_idx
      where id=v_child_id and product_id=v_id;
      if not found then raise exception 'Rang mahsulotga tegishli emas'; end if;
    else
      insert into public.product_colors(product_id,name,hex_code,swatch_colors,available,sort_order)
      values(v_id,v_label,v_colors[1],v_colors,v_available,v_idx)
      returning id into v_child_id;
    end if;
    v_kept_colors := array_append(v_kept_colors,v_child_id);
    v_idx := v_idx + 1;
  end loop;
  delete from public.product_colors where product_id=v_id and not (id=any(v_kept_colors));
  return v_id;
end;
$$;

revoke all on function public.forma_save_product(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.forma_save_product(jsonb,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';
