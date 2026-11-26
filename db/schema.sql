-- Warband: shared post-game boards and run logs for copies of the game hosted outside Claude.
-- Applied to the Supabase project "warband" (Sydney). Kept here for reference; the database is the authority.
-- Players may read and add. Nobody playing may change or delete. Shape and size limits live in the constraints.

create table public.ghosts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_key text not null unique check (char_length(run_key) between 1 and 64),
  balance int not null default 1 check (balance between 1 and 100000),
  faction text not null check (faction in ('H', 'E', 'U')),
  leader text check (leader is null or char_length(leader) <= 40),
  relics jsonb not null default '[]'::jsonb check (jsonb_typeof(relics) = 'array' and jsonb_array_length(relics) <= 20 and octet_length(relics::text) <= 600),
  slots int not null check (slots between 4 and 10),
  round int check (round is null or round between 1 and 500),
  units jsonb not null check (jsonb_typeof(units) = 'array' and jsonb_array_length(units) between 1 and 10 and octet_length(units::text) <= 4000),
  player text check (player is null or char_length(player) <= 40)
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_key text not null check (char_length(run_key) between 1 and 64),
  ended timestamptz,
  balance int not null default 1 check (balance between 1 and 100000),
  faction text not null check (faction in ('H', 'E', 'U')),
  leader text check (leader is null or char_length(leader) <= 40),
  outcome text not null check (outcome in ('won', 'lost', 'abandoned')),
  wins int not null check (wins between 0 and 1000),
  rounds int not null check (rounds between 0 and 1000),
  post int check (post is null or post between 0 and 1000),
  player text check (player is null or char_length(player) <= 40),
  log jsonb not null check (jsonb_typeof(log) = 'object' and octet_length(log::text) <= 400000)
);
-- A run that goes on into the post-game is saved again under the same run_key; the newest row is the complete one.
create index runs_run_key_idx on public.runs (run_key);
create index runs_created_at_idx on public.runs (created_at desc);
create index ghosts_created_at_idx on public.ghosts (created_at desc);

-- A ceiling on rows, so a flood of inserts cannot fill the database.
create function public.warband_row_cap() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare n bigint; cap bigint := tg_argv[0]::bigint;
begin
  execute format('select count(*) from %I.%I', tg_table_schema, tg_table_name) into n;
  if n >= cap then raise exception 'table is full' using errcode = 'check_violation'; end if;
  return new;
end $$;
revoke all on function public.warband_row_cap() from public, anon, authenticated;
create trigger ghosts_cap before insert on public.ghosts for each row execute function public.warband_row_cap('5000');
create trigger runs_cap before insert on public.runs for each row execute function public.warband_row_cap('10000');

alter table public.ghosts enable row level security;
alter table public.runs enable row level security;

revoke all on public.ghosts, public.runs from anon, authenticated;
grant select, insert on public.ghosts, public.runs to anon, authenticated;

create policy "anyone can read ghosts" on public.ghosts for select to anon, authenticated using (true);
create policy "anyone can add a ghost" on public.ghosts for insert to anon, authenticated with check (true);
create policy "anyone can read runs" on public.runs for select to anon, authenticated using (true);
create policy "anyone can add a run" on public.runs for insert to anon, authenticated with check (true);
