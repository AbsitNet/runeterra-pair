-- Пара из Рунтерры: одна игра на нескольких устройствах.
-- Устройства связываются кодом. Всё, что игра хранит в браузере, лежит здесь по ключам: значение, метка времени
-- и номер правки. При синхронизации по каждому ключу побеждает более свежая запись.
-- Таблица закрыта RLS: браузер работает только через функции link_*, и без кода прочитать ничего нельзя.
-- Коды, по которым 180 дней не было синхронизации, удаляются.

create table if not exists public.pair_links (
  code        text primary key check (code ~ '^[A-Z2-9]{10}$'),
  data        jsonb not null default '{}'::jsonb,
  rev         bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.pair_links enable row level security;
revoke all on public.pair_links from anon, authenticated;

create or replace function public.link_create()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_raw   bytea;
  v_try   int := 0;
begin
  delete from pair_links where updated_at < now() - interval '180 days';
  loop
    /* 10 случайных байт из двух UUID v4 (в обход байтов версии и варианта), каждый — один из 32 знаков */
    v_raw := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..9 loop
      v_code := v_code || substr(v_alpha, 1 + get_byte(v_raw, case when i < 6 then i else 10 + i end) % 32, 1);
    end loop;
    begin
      insert into pair_links(code) values (v_code);
      return v_code;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 20 then raise exception 'code_exhausted'; end if;
    end;
  end loop;
end $$;

/* p_items: {ключ: {t: метка времени, v: значение или null, если ключ удалён}}; p_since — номер правки, который устройство уже видело.
   Возвращает номер правки, время сервера и всё, что новее p_since, плюс ключи, где у сервера запись свежее присланной. */
create or replace function public.link_sync(p_code text, p_items jsonb, p_since bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_data    jsonb;
  v_rev     bigint;
  v_new     bigint;
  v_key     text;
  v_val     jsonb;
  v_old     jsonb;
  v_changed boolean := false;
  v_back    text[] := '{}';
  v_out     jsonb;
begin
  p_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  select data, rev into v_data, v_rev from pair_links where code = p_code for update;
  if not found then raise exception 'link_not_found'; end if;
  if p_items is not null and jsonb_typeof(p_items) = 'object' and p_items <> '{}'::jsonb then
    if pg_column_size(p_items) > 400000 then raise exception 'link_too_large'; end if;
    v_new := v_rev + 1;
    for v_key, v_val in select key, value from jsonb_each(p_items) loop
      if v_key !~ '^rp-[A-Za-z0-9_-]{1,80}$' or coalesce(jsonb_typeof(v_val), '') <> 'object' or coalesce(jsonb_typeof(v_val->'t'), '') <> 'number' then continue; end if;
      v_old := v_data->v_key;
      if v_old is null or (v_val->>'t')::numeric > (v_old->>'t')::numeric then
        v_data := jsonb_set(v_data, array[v_key], jsonb_build_object('t', v_val->'t', 'v', coalesce(v_val->'v', 'null'::jsonb), 'r', v_new));
        v_changed := true;
      elsif (v_val->>'t')::numeric < (v_old->>'t')::numeric then
        v_back := v_back || v_key;
      end if;
    end loop;
    if v_changed then
      if pg_column_size(v_data) > 2000000 then raise exception 'link_too_large'; end if;
      v_rev := v_new;
      update pair_links set data = v_data, rev = v_rev, updated_at = now() where code = p_code;
    end if;
  end if;
  if not v_changed then update pair_links set updated_at = now() where code = p_code and updated_at < now() - interval '1 day'; end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_out
    from jsonb_each(v_data) where (value->>'r')::bigint > coalesce(p_since, 0) or key = any(v_back);
  return jsonb_build_object('rev', v_rev, 'items', v_out, 'now', floor(extract(epoch from clock_timestamp()) * 1000)::bigint);
end $$;

revoke all on function public.link_create(), public.link_sync(text, jsonb, bigint) from public;
grant execute on function public.link_create(), public.link_sync(text, jsonb, bigint) to anon, authenticated;
