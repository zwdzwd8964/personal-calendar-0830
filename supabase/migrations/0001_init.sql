-- 双轨备忘录 P1 · Supabase 初始化（在 Supabase Dashboard → SQL Editor 里整段执行一次）
-- 两表 + RLS 行级隔离 + 导入用的原子 replace_all RPC（CLAUDE.md §6 / §13）

-- ─────────────────────────── meals ───────────────────────────
create table public.meals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('lunch', 'dinner')),
  person text not null,
  place text,
  note text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- 一槽一条（§5）；应用层挤占冲突先删后存，与该索引兼容
create unique index meals_user_date_slot on public.meals (user_id, date, slot);

-- ─────────────────────────── tasks ───────────────────────────
create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('fuzzy', 'firm')),
  status text not null check (status in ('todo', 'doing', 'done', 'shelved')),
  important boolean not null,
  urgent boolean not null,
  size text check (size in ('S', 'M', 'L', 'XL')),
  deadline date,
  estimate_days numeric,
  tags text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  sort_order integer not null,
  note text,
  done_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index tasks_user_idx on public.tasks (user_id);

-- ─────────────────────────── RLS ───────────────────────────
alter table public.meals enable row level security;
alter table public.tasks enable row level security;

create policy "own meals" on public.meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tasks" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────── 导入：原子 replace_all ───────────────────────
-- 删除当前用户全部数据并整包重建；函数体单事务，导入要么全成要么全不动
create or replace function public.replace_all(p_meals jsonb, p_tasks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.meals where user_id = auth.uid();
  delete from public.tasks where user_id = auth.uid();

  insert into public.meals (id, date, slot, person, place, note, created_at, updated_at)
  select
    (m ->> 'id')::uuid,
    (m ->> 'date')::date,
    m ->> 'slot',
    m ->> 'person',
    m ->> 'place',
    m ->> 'note',
    (m ->> 'created_at')::timestamptz,
    (m ->> 'updated_at')::timestamptz
  from jsonb_array_elements(coalesce(p_meals, '[]'::jsonb)) as m;

  insert into public.tasks (id, title, mode, status, important, urgent, size, deadline,
                            estimate_days, tags, checklist, sort_order, note, done_at,
                            created_at, updated_at)
  select
    (t ->> 'id')::uuid,
    t ->> 'title',
    t ->> 'mode',
    t ->> 'status',
    (t ->> 'important')::boolean,
    (t ->> 'urgent')::boolean,
    t ->> 'size',
    (t ->> 'deadline')::date,
    (t ->> 'estimate_days')::numeric,
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(t -> 'tags') as x),
      '{}'::text[]
    ),
    coalesce(t -> 'checklist', '[]'::jsonb),
    (t ->> 'sort_order')::integer,
    t ->> 'note',
    (t ->> 'done_at')::timestamptz,
    (t ->> 'created_at')::timestamptz,
    (t ->> 'updated_at')::timestamptz
  from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) as t;
end;
$$;

-- 仅登录用户可调用
revoke execute on function public.replace_all(jsonb, jsonb) from public, anon;
grant execute on function public.replace_all(jsonb, jsonb) to authenticated;
