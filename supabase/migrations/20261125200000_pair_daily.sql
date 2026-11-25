-- Пара из Рунтерры: дуэль дня. Одна пара в сутки для всех игроков (сутки — по Москве).
-- Хранится только выбор и случайный номер устройства, без имён. Таблица закрыта RLS, браузер работает через две функции.

create table if not exists public.pair_daily (
  day         date not null,
  voter       uuid not null,
  pick        text not null check (pick ~ '^[A-Za-z]{2,20}$'),
  created_at  timestamptz not null default now(),
  primary key (day, voter)
);
create index if not exists pair_daily_created_idx on public.pair_daily (created_at);

alter table public.pair_daily enable row level security;
revoke all on public.pair_daily from anon, authenticated;

-- голос за сегодняшнюю (или вчерашнюю — для тех, кто голосует ровно в полночь) дуэль; повторный голос не меняет первый
create or replace function public.daily_vote(p_day date, p_voter uuid, p_pick text)
returns void language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Moscow')::date;
begin
  if p_day is null or p_day < today - 1 or p_day > today then raise exception 'bad_day'; end if;
  if p_voter is null or p_pick !~ '^[A-Za-z]{2,20}$' then raise exception 'bad_input'; end if;
  if (select count(*) from pair_daily where created_at > now() - interval '10 seconds') > 60 then raise exception 'busy'; end if;
  insert into pair_daily(day, voter, pick) values (p_day, p_voter, p_pick) on conflict (day, voter) do nothing;
end $$;

-- сколько голосов за каждого участника дня
create or replace function public.daily_get(p_day date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from pair_daily where day = p_day),
    'picks', coalesce((select jsonb_object_agg(pick, c) from (select pick, count(*)::int as c from pair_daily where day = p_day group by pick) t), '{}'::jsonb)
  );
$$;

revoke all on function public.daily_vote(date, uuid, text), public.daily_get(date) from public;
grant execute on function public.daily_vote(date, uuid, text), public.daily_get(date) to anon, authenticated;
