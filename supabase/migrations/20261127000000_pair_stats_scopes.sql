-- Пара из Рунтерры: раздельная статистика.
-- Основной турнир, каждый мини-турнир, каждая линейка образов и турнир образов каждого чемпиона считаются отдельно.
-- Область хранится в scope; старые строки — основной турнир. Для образов «пара» — образ вида Ahri_27.
alter table public.pair_results add column if not exists scope text not null default 'main';
alter table public.pair_results drop constraint if exists pair_results_champ_check;
alter table public.pair_results add constraint pair_results_champ_check check (champ ~ '^[A-Za-z]{2,20}(_[0-9]{1,4})?$');
alter table public.pair_results drop constraint if exists pair_results_n_check;
alter table public.pair_results add constraint pair_results_n_check check (n between 2 and 200);
alter table public.pair_results add constraint pair_results_scope_check check (scope ~ '^(main|mini:[a-z]{2,8}|line:[a-z]{2,8}|skins:[A-Za-z]{2,20})$');
create index if not exists pair_results_scope_champ on public.pair_results(scope, champ);

-- старая функция чтения теперь видит только основной турнир
create or replace function public.stats_get(p_champ text)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (select * from pair_results where scope = 'main'),
       w as (select champ, count(*)::int as c from r group by champ),
       me as (select coalesce((select c from w where champ = p_champ), 0) as c)
  select jsonb_build_object(
    'total',  (select count(*) from r),
    'champs', (select count(*) from w),
    'mine',   (select c from me),
    'rank',   (select count(*) + 1 from w where c > (select c from me)),
    'inTop',  (select count(*) from r where p_champ = any(top)),
    'top',    coalesce((select jsonb_agg(jsonb_build_object('id', champ, 'n', c) order by c desc, champ)
                        from (select champ, c from w order by c desc, champ limit 8) t), '[]'::jsonb)
  );
$$;

create or replace function public.stats_submit_in(p_id uuid, p_scope text, p_champ text, p_top text[], p_who text, p_n integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  if p_id is null or p_scope !~ '^(main|mini:[a-z]{2,8}|line:[a-z]{2,8}|skins:[A-Za-z]{2,20})$' then raise exception 'bad_input'; end if;
  if p_champ !~ '^[A-Za-z]{2,20}(_[0-9]{1,4})?$' then raise exception 'bad_input'; end if;
  if p_top is null or cardinality(p_top) > 10 then raise exception 'bad_input'; end if;
  foreach t in array p_top loop
    if t !~ '^[A-Za-z]{2,20}(_[0-9]{1,4})?$' then raise exception 'bad_input'; end if;
  end loop;
  if p_who not in ('all', 'm', 'f') or p_n not between 2 and 200 then raise exception 'bad_input'; end if;
  if (select count(*) from pair_results where updated_at > now() - interval '10 seconds') > 60 then raise exception 'busy'; end if;
  insert into pair_results(id, scope, champ, top, who, n) values (p_id, p_scope, p_champ, p_top, p_who, p_n)
  on conflict (id) do update set scope = excluded.scope, champ = excluded.champ, top = excluded.top, who = excluded.who, n = excluded.n, updated_at = now();
end $$;

create or replace function public.stats_get_in(p_scope text, p_champ text)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (select * from pair_results where scope = p_scope),
       w as (select champ, count(*)::int as c from r group by champ),
       me as (select coalesce((select c from w where champ = p_champ), 0) as c)
  select jsonb_build_object(
    'total',  (select count(*) from r),
    'champs', (select count(*) from w),
    'mine',   (select c from me),
    'rank',   (select count(*) + 1 from w where c > (select c from me)),
    'inTop',  (select count(*) from r where p_champ = any(top)),
    'top',    coalesce((select jsonb_agg(jsonb_build_object('id', champ, 'n', c) order by c desc, champ)
                        from (select champ, c from w order by c desc, champ limit 8) t), '[]'::jsonb)
  );
$$;

revoke all on function public.stats_submit_in(uuid, text, text, text[], text, integer), public.stats_get_in(text, text) from public;
grant execute on function public.stats_submit_in(uuid, text, text, text[], text, integer), public.stats_get_in(text, text) to anon, authenticated;
