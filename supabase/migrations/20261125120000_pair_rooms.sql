-- Пара из Рунтерры: комнаты на двоих.
-- Таблицы закрыты политиками RLS: браузер работает только через функции ниже,
-- поэтому прочитать чужую комнату можно, лишь зная её код, а изменить своё состояние — лишь зная свой секретный токен.

create table if not exists public.pair_rooms (
  code        text primary key check (code ~ '^[A-Z2-9]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.pair_players (
  room_code   text not null references public.pair_rooms(code) on delete cascade,
  slot        smallint not null check (slot in (1, 2)),
  token       uuid not null default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (room_code, slot)
);

alter table public.pair_rooms   enable row level security;
alter table public.pair_players enable row level security;
revoke all on public.pair_rooms, public.pair_players from anon, authenticated;

-- создать комнату: возвращает код, слот и секретный токен игрока
create or replace function public.pair_create_room(p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_token uuid;
  v_alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_try   int := 0;
begin
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) not between 1 and 40 then raise exception 'name_invalid'; end if;
  -- уборка: комнаты, где никто не появлялся 90 дней
  delete from pair_rooms where updated_at < now() - interval '90 days';
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
    end loop;
    begin
      insert into pair_rooms(code) values (v_code);
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 20 then raise exception 'code_exhausted'; end if;
    end;
  end loop;
  insert into pair_players(room_code, slot, name) values (v_code, 1, p_name) returning token into v_token;
  return jsonb_build_object('code', v_code, 'slot', 1, 'token', v_token);
end $$;

-- войти в комнату вторым игроком
create or replace function public.pair_join_room(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_token uuid;
begin
  p_code := upper(btrim(coalesce(p_code, '')));
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) not between 1 and 40 then raise exception 'name_invalid'; end if;
  perform 1 from pair_rooms where code = p_code for update;
  if not found then raise exception 'room_not_found'; end if;
  if exists (select 1 from pair_players where room_code = p_code and slot = 2) then raise exception 'room_full'; end if;
  insert into pair_players(room_code, slot, name) values (p_code, 2, p_name) returning token into v_token;
  update pair_rooms set updated_at = now() where code = p_code;
  return jsonb_build_object('code', p_code, 'slot', 2, 'token', v_token);
end $$;

-- прочитать комнату по коду (без токенов)
create or replace function public.pair_get_room(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb;
begin
  p_code := upper(btrim(coalesce(p_code, '')));
  if not exists (select 1 from pair_rooms where code = p_code) then raise exception 'room_not_found'; end if;
  select jsonb_build_object(
    'code', p_code,
    'players', coalesce(jsonb_agg(jsonb_build_object('slot', slot, 'name', name, 'state', state, 'updated_at', updated_at) order by slot), '[]'::jsonb)
  ) into v
  from pair_players where room_code = p_code;
  return v;
end $$;

-- сохранить своё состояние (прогресс турнира, итог, «Угадай мой выбор»)
create or replace function public.pair_save_state(p_code text, p_token uuid, p_state jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_at timestamptz := now();
begin
  p_code := upper(btrim(coalesce(p_code, '')));
  if pg_column_size(p_state) > 200000 then raise exception 'state_too_large'; end if;
  update pair_players set state = p_state, updated_at = v_at
   where room_code = p_code and token = p_token;
  if not found then raise exception 'bad_token'; end if;
  update pair_rooms set updated_at = v_at where code = p_code;
  return v_at;
end $$;

revoke all on function public.pair_create_room(text), public.pair_join_room(text, text),
  public.pair_get_room(text), public.pair_save_state(text, uuid, jsonb) from public;
grant execute on function public.pair_create_room(text), public.pair_join_room(text, text),
  public.pair_get_room(text), public.pair_save_state(text, uuid, jsonb) to anon, authenticated;
