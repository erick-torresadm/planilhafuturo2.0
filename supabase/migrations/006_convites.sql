-- ============================================================
-- 006 — Convite de ADM + workspace compartilhado
-- Tabelas convites e workspace_members + RLS aditiva de admin.
-- Aplicar manualmente no Supabase Dashboard (SQL Editor).
-- ============================================================

-- ============ convites ============
create table if not exists convites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  email text,
  role text not null default 'admin',
  token text not null unique,
  status text not null default 'pendente' check (status in ('pendente','aceito','revogado')),
  aceito_por uuid references profiles(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  aceito_em timestamptz
);
alter table convites enable row level security;
create policy "convites_owner_all" on convites
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant all on convites to authenticated, service_role;

-- ============ workspace_members ============
create table if not exists workspace_members (
  owner_id uuid not null references profiles(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'admin',
  criado_em timestamptz not null default now(),
  primary key (owner_id, member_id)
);
create index if not exists workspace_members_member_idx on workspace_members(member_id);
alter table workspace_members enable row level security;
create policy "wm_member_select" on workspace_members
  for select using (auth.uid() = member_id);
create policy "wm_owner_all" on workspace_members
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant all on workspace_members to authenticated, service_role;

-- ============ RLS aditiva: ADM acessa dados do owner ============
do $$
declare t text;
begin
  foreach t in array array[
    'gastos_fixos','parcelas','desejos','caixinhas','investimentos',
    'tarefas','focos_diarios','pomodoros','habitos','habitos_registros',
    'lancamentos','assinaturas','notas','compras_avulsas'
  ]
  loop
    execute format(
      'create policy "admin_ws_all" on %I for all
         using (user_id in (select owner_id from workspace_members where member_id = auth.uid()))
         with check (user_id in (select owner_id from workspace_members where member_id = auth.uid()))',
      t
    );
  end loop;
end $$;

-- member pode LER o perfil do owner (nome p/ switcher) mas NÃO editar
create policy "profiles_ws_select" on profiles for select
  using (id in (select owner_id from workspace_members where member_id = auth.uid()));
