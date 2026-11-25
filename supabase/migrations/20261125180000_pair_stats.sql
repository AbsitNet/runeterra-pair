-- Пара из Рунтерры: анонимная статистика всех игроков.
-- Хранится только итоговая пара, топ-10 и размер состава — без имён и без привязки к комнатам.
-- Таблица закрыта RLS, браузер работает через две функции ниже.

create table if not exists public.pair_results (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  champ       text not null check (champ ~ '^[A-Za-z]{2,20}$'),
  top         text[] not null default '{}' check (cardinality(top) <= 10),
  who         text not null default 'all' check (who in ('all', 'm', 'f')),
  n           smallint not null check (n between 8 and 200)
);
create index if not exists pair_results_champ_idx on public.pair_results (champ);
create index if not exists pair_results_created_idx on public.pair_results (created_at);

alter table public.pair_results enable row level security;
revoke all on public.pair_results from anon, authenticated;

-- записать или обновить свой результат (повторный вызов с тем же id, например после переигровки финала, не добавляет новую строку)
create or replace function public.stats_submit(p_id uuid, p_champ text, p_top text[], p_who text, p_n int)
returns void language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  if p_id is null or p_champ !~ '^[A-Za-z]{2,20}$' then raise exception 'bad_input'; end if;
  if p_top is null or cardinality(p_top) > 10 then raise exception 'bad_input'; end if;
  foreach t in array p_top loop
    if t !~ '^[A-Za-z]{2,20}$' then raise exception 'bad_input'; end if;
  end loop;
  if p_who not in ('all', 'm', 'f') or p_n not between 8 and 200 then raise exception 'bad_input'; end if;
  -- грубая защита от засорения: не больше 60 записей за 10 секунд на всех
  if (select count(*) from pair_results where updated_at > now() - interval '10 seconds') > 60 then raise exception 'busy'; end if;
  insert into pair_results(id, champ, top, who, n) values (p_id, p_champ, p_top, p_who, p_n)
  on conflict (id) do update set champ = excluded.champ, top = excluded.top, who = excluded.who, n = excluded.n, updated_at = now();
end $$;

-- статистика для экрана итогов: сколько всего результатов, как часто выбирают эту пару и кто в лидерах
create or replace function public.stats_get(p_champ text)
returns jsonb language sql stable security definer set search_path = public as $$
  with w as (select champ, count(*)::int as c from pair_results group by champ),
       me as (select coalesce((select c from w where champ = p_champ), 0) as c)
  select jsonb_build_object(
    'total',  (select count(*) from pair_results),
    'champs', (select count(*) from w),
    'mine',   (select c from me),
    'rank',   (select count(*) + 1 from w where c > (select c from me)),
    'inTop',  (select count(*) from pair_results where p_champ = any(top)),
    'top',    coalesce((select jsonb_agg(jsonb_build_object('id', champ, 'n', c) order by c desc, champ)
                        from (select champ, c from w order by c desc, champ limit 8) t), '[]'::jsonb)
  );
$$;

revoke all on function public.stats_submit(uuid, text, text[], text, int), public.stats_get(text) from public;
grant execute on function public.stats_submit(uuid, text, text[], text, int), public.stats_get(text) to anon, authenticated;
