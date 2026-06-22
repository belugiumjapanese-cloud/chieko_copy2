-- ================================================================
-- LANDMARK 1件追加・更新テンプレート
--
-- 前提:
--   1. architecture_landmark_search.sql を実行済み
--   2. landmark_catalog_v2_bauhaus.sql を実行済み
--
-- 使い方:
--   「ここだけ編集」内の値を置き換え、Supabase SQL Editorで全文実行します。
--   同じ v_catalog_key で再実行すると、重複せず既存レコードを更新します。
-- ================================================================

do $$
declare
  -- ==============================================================
  -- ここだけ編集
  -- ==============================================================

  -- 英小文字・数字・ハイフンで、この建築だけの一意なキーを付ける。
  -- 例: bauhaus-dessau-building / villa-savoye-poissy
  v_catalog_key text := 'bauhaus-dessau-building';

  -- content_categories.slug。通常の建築は architecture。
  v_category_slug text := 'architecture';

  -- 基本情報
  v_name_en text := 'Bauhaus Dessau';
  v_name_ja text := 'バウハウス デッサウ校';
  v_description text := 'The Bauhaus school building in Dessau, completed in 1926.';
  v_address text := 'Gropiusallee 38, 06846 Dessau-Roßlau, Germany';
  v_latitude double precision := 51.8393593;
  v_longitude double precision := 12.2273397;
  v_completion_year integer := 1926; -- 不明なら null
  v_cover_image_url text := null; -- 不明なら null。投稿画像から自動選択される
  v_source_url text := 'https://bauhaus-dessau.de/';
  v_status text := 'published'; -- published / draft / archived

  -- 設計者。何人でも追加可能。配列の先頭が代表設計者になる。
  -- catalog_key は設計者ごとに固定し、別の建築でも同じ値を再利用する。
  v_architects jsonb := $json$
  [
    {
      "catalog_key": "walter-gropius",
      "name_en": "Walter Gropius",
      "name_ja": "ヴァルター・グロピウス",
      "aliases": ["Walter Adolph Gropius", "W. Gropius", "グロピウス"],
      "role": "architect"
    }
  ]
  $json$::jsonb;

  -- 英語・日本語の主名称は上の v_name_en / v_name_ja から自動登録される。
  -- ここには追加の正式名、別名、旧名、略称だけを書く。何個でも追加可能。
  -- name_type: official / alias / former / short
  v_other_names jsonb := $json$
  [
    {"name": "Bauhaus Building Dessau", "locale": "en", "name_type": "official"},
    {"name": "Bauhausgebäude Dessau", "locale": "de", "name_type": "official"},
    {"name": "バウハウス・デッサウ校", "locale": "ja", "name_type": "alias"}
  ]
  $json$::jsonb;

  -- 検索候補に使う関連語。何個でも追加可能。
  -- keyword_type: related / style / movement / material / feature / use
  v_keywords jsonb := $json$
  [
    {"keyword": "バウハウス", "locale": "ja", "keyword_type": "movement"},
    {"keyword": "Bauhaus", "locale": "en", "keyword_type": "movement"},
    {"keyword": "モダニズム", "locale": "ja", "keyword_type": "style"},
    {"keyword": "Modernism", "locale": "en", "keyword_type": "style"}
  ]
  $json$::jsonb;

  -- ==============================================================
  -- ここから下は編集しない
  -- ==============================================================

  v_category_id uuid;
  v_landmark_id uuid;
  v_primary_architect_id uuid;
  v_primary_architect_key text;
  v_landmark_aliases text[];
  v_architect_aliases text[];
  v_item jsonb;
begin
  if nullif(trim(v_catalog_key), '') is null then
    raise exception 'v_catalog_key is required';
  end if;

  if nullif(trim(v_name_en), '') is null then
    raise exception 'v_name_en is required';
  end if;

  if v_latitude not between -90 and 90 then
    raise exception 'latitude must be between -90 and 90';
  end if;

  if v_longitude not between -180 and 180 then
    raise exception 'longitude must be between -180 and 180';
  end if;

  if jsonb_typeof(v_architects) <> 'array' or jsonb_array_length(v_architects) = 0 then
    raise exception 'v_architects must contain at least one architect';
  end if;

  select id
  into v_category_id
  from public.content_categories
  where slug = v_category_slug;

  if v_category_id is null then
    raise exception 'content category "%" does not exist', v_category_slug;
  end if;

  -- 設計者を作成・更新する。UUIDはSupabaseが自動発行する。
  for v_item in
    select value from jsonb_array_elements(v_architects)
  loop
    if nullif(trim(v_item ->> 'catalog_key'), '') is null
       or nullif(trim(v_item ->> 'name_en'), '') is null then
      raise exception 'each architect requires catalog_key and name_en';
    end if;

    select coalesce(array_agg(alias_value), array[]::text[])
    into v_architect_aliases
    from jsonb_array_elements_text(coalesce(v_item -> 'aliases', '[]'::jsonb)) as aliases(alias_value);

    insert into public.architects as existing (
      catalog_key,
      name_en,
      name_ja,
      aliases
    )
    values (
      trim(v_item ->> 'catalog_key'),
      trim(v_item ->> 'name_en'),
      coalesce(trim(v_item ->> 'name_ja'), ''),
      v_architect_aliases
    )
    on conflict (catalog_key) do update set
      name_en = excluded.name_en,
      name_ja = coalesce(nullif(excluded.name_ja, ''), existing.name_ja),
      aliases = array(
        select distinct alias_value
        from unnest(existing.aliases || excluded.aliases) as merged_aliases(alias_value)
        order by alias_value
      ),
      updated_at = now();
  end loop;

  v_primary_architect_key := v_architects -> 0 ->> 'catalog_key';

  select id
  into v_primary_architect_id
  from public.architects
  where catalog_key = v_primary_architect_key;

  -- 追加名称を、旧形式のaliases列にも同期する。
  select coalesce(array_agg(name_value order by item_order), array[]::text[])
  into v_landmark_aliases
  from (
    select
      trim(item ->> 'name') as name_value,
      ordinality as item_order
    from jsonb_array_elements(v_other_names) with ordinality as names(item, ordinality)
    where nullif(trim(item ->> 'name'), '') is not null
  ) aliases;

  -- 建築本体を作成・更新する。UUIDはSupabaseが自動発行する。
  insert into public.landmarks (
    catalog_key,
    category_id,
    architect_id,
    name_en,
    name_ja,
    aliases,
    description,
    address,
    latitude,
    longitude,
    completion_year,
    cover_image_url,
    source_url,
    status
  )
  values (
    trim(v_catalog_key),
    v_category_id,
    v_primary_architect_id,
    trim(v_name_en),
    coalesce(trim(v_name_ja), ''),
    v_landmark_aliases,
    coalesce(v_description, ''),
    coalesce(v_address, ''),
    v_latitude,
    v_longitude,
    v_completion_year,
    nullif(trim(v_cover_image_url), ''),
    nullif(trim(v_source_url), ''),
    v_status
  )
  on conflict (catalog_key) do update set
    category_id = excluded.category_id,
    architect_id = excluded.architect_id,
    name_en = excluded.name_en,
    name_ja = excluded.name_ja,
    aliases = excluded.aliases,
    description = excluded.description,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    completion_year = excluded.completion_year,
    cover_image_url = excluded.cover_image_url,
    source_url = excluded.source_url,
    status = excluded.status,
    updated_at = now()
  returning id into v_landmark_id;

  -- 設計者の紐付けを入力配列の内容へ同期する。
  delete from public.landmark_architects
  where landmark_id = v_landmark_id;

  insert into public.landmark_architects (
    landmark_id,
    architect_id,
    role,
    sort_order
  )
  select
    v_landmark_id,
    architect.id,
    coalesce(nullif(trim(item ->> 'role'), ''), 'architect'),
    (ordinality - 1)::integer
  from jsonb_array_elements(v_architects) with ordinality as architect_input(item, ordinality)
  join public.architects architect
    on architect.catalog_key = item ->> 'catalog_key';

  -- 名称を入力内容へ同期する。主名称2件は基本情報から自動作成する。
  delete from public.landmark_names
  where landmark_id = v_landmark_id;

  insert into public.landmark_names (
    landmark_id,
    name,
    locale,
    name_type,
    is_primary,
    sort_order
  )
  values
    (v_landmark_id, trim(v_name_en), 'en', 'primary', true, 0);

  if nullif(trim(v_name_ja), '') is not null then
    insert into public.landmark_names (
      landmark_id,
      name,
      locale,
      name_type,
      is_primary,
      sort_order
    )
    values
      (v_landmark_id, trim(v_name_ja), 'ja', 'primary', true, 0);
  end if;

  insert into public.landmark_names (
    landmark_id,
    name,
    locale,
    name_type,
    is_primary,
    sort_order
  )
  select
    v_landmark_id,
    trim(item ->> 'name'),
    coalesce(nullif(trim(item ->> 'locale'), ''), 'und'),
    coalesce(nullif(trim(item ->> 'name_type'), ''), 'alias'),
    false,
    (ordinality * 10)::integer
  from jsonb_array_elements(v_other_names) with ordinality as name_input(item, ordinality)
  where nullif(trim(item ->> 'name'), '') is not null
  on conflict (landmark_id, locale, name) do nothing;

  -- 関連語を入力配列の内容へ同期する。
  delete from public.landmark_keywords
  where landmark_id = v_landmark_id;

  insert into public.landmark_keywords (
    landmark_id,
    keyword,
    locale,
    keyword_type,
    sort_order
  )
  select
    v_landmark_id,
    trim(item ->> 'keyword'),
    coalesce(nullif(trim(item ->> 'locale'), ''), 'und'),
    coalesce(nullif(trim(item ->> 'keyword_type'), ''), 'related'),
    (ordinality - 1)::integer
  from jsonb_array_elements(v_keywords) with ordinality as keyword_input(item, ordinality)
  where nullif(trim(item ->> 'keyword'), '') is not null
  on conflict (landmark_id, locale, keyword) do update set
    keyword_type = excluded.keyword_type,
    sort_order = excluded.sort_order;

  raise notice 'LANDMARK SAVED: catalog_key=%, id=%', v_catalog_key, v_landmark_id;
end
$$;

-- 実行後、通知欄に「LANDMARK SAVED」が出れば登録成功。
-- app_landmark_searchでcatalog_keyを検索すると、アプリが読む完成形を確認できます。
