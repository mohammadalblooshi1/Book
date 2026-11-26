-- PHONIEX Intelligence — Phase 1 schema
-- Multi-tenant core: organizations (workspaces), memberships, agents, agent runs,
-- project requests, public leads and an audit log.
-- Tenant isolation is enforced with Postgres Row Level Security (RLS).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organizations (tenants / workspaces) and memberships
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  industry text not null,
  division text not null check (division in ('enterprise', 'business', 'home')),
  plan text not null default 'starter' check (plan in ('starter', 'professional', 'enterprise')),
  brand_color text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'admin', 'member', 'viewer');

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Helper functions. SECURITY DEFINER so they can read memberships without
-- recursing through the memberships RLS policies.
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles public.org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = auth.uid() and role = any (p_roles)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

-- Creating a workspace: insert org + owner membership atomically.
create or replace function public.create_organization(
  p_name text,
  p_industry text,
  p_division text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.organizations (name, industry, division, created_by)
  values (p_name, p_industry, p_division, auth.uid())
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role)
  values (v_org, auth.uid(), 'owner');

  insert into public.audit_logs (org_id, actor_id, action, details)
  values (v_org, auth.uid(), 'organization.created', jsonb_build_object('name', p_name));

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- AI agents (Agent Builder) and run logs
-- ---------------------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  template text not null,
  role_description text not null default '',
  instructions text not null default '',
  knowledge text not null default '',
  model text not null default 'claude-opus-5-5',
  effort text not null default 'medium' check (effort in ('low', 'medium', 'high')),
  approval_policy text not null default 'sensitive'
    check (approval_policy in ('none', 'sensitive', 'all')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  monthly_message_limit integer not null default 500 check (monthly_message_limit >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agents_org_idx on public.agents (org_id);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null check (status in ('ok', 'refused', 'error', 'limited')),
  error text,
  created_at timestamptz not null default now()
);
create index agent_runs_org_idx on public.agent_runs (org_id, created_at desc);
create index agent_runs_agent_idx on public.agent_runs (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Project requests (customer journey: describe business -> proposal)
-- ---------------------------------------------------------------------------
create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  submitted_by uuid references auth.users (id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  company text not null,
  industry text not null,
  services text[] not null default '{}',
  goals text not null,
  budget text,
  timeline text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'proposal_sent', 'approved', 'in_progress', 'delivered', 'closed')),
  created_at timestamptz not null default now()
);
create index project_requests_org_idx on public.project_requests (org_id);

-- ---------------------------------------------------------------------------
-- Public contact-form leads (written server-side with the service role only)
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  phone text,
  industry text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.project_requests enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: self, plus platform admins
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());
create policy "profiles: update own name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Prevent users from granting themselves platform-admin.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- organizations
create policy "orgs: members read" on public.organizations
  for select using (public.is_org_member(id) or public.is_platform_admin());
create policy "orgs: owners/admins update" on public.organizations
  for update using (public.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.org_role[]));
-- Inserts go through create_organization(); deletes are not exposed.
-- Only name/branding are user-editable; plan changes go through billing (service role).
revoke update on public.organizations from authenticated;
grant update (name, brand_color) on public.organizations to authenticated;

-- memberships
create policy "memberships: members read" on public.memberships
  for select using (public.is_org_member(org_id) or public.is_platform_admin());
create policy "memberships: owners manage" on public.memberships
  for all using (public.has_org_role(org_id, array['owner']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner']::public.org_role[]));

-- agents
create policy "agents: members read" on public.agents
  for select using (public.is_org_member(org_id) or public.is_platform_admin());
create policy "agents: editors insert" on public.agents
  for insert with check (public.has_org_role(org_id, array['owner', 'admin', 'member']::public.org_role[]));
create policy "agents: editors update" on public.agents
  for update using (public.has_org_role(org_id, array['owner', 'admin', 'member']::public.org_role[]))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'member']::public.org_role[]));
create policy "agents: admins delete" on public.agents
  for delete using (public.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

-- agent_runs: read by members; written by the server after a chat turn
create policy "agent_runs: members read" on public.agent_runs
  for select using (public.is_org_member(org_id) or public.is_platform_admin());
create policy "agent_runs: members insert own" on public.agent_runs
  for insert with check (public.is_org_member(org_id) and user_id = auth.uid());

-- project_requests
create policy "project_requests: members read" on public.project_requests
  for select using (
    (org_id is not null and public.is_org_member(org_id))
    or submitted_by = auth.uid()
    or public.is_platform_admin()
  );
create policy "project_requests: members insert" on public.project_requests
  for insert with check (
    submitted_by = auth.uid()
    and (org_id is null or public.is_org_member(org_id))
    and status = 'new'
  );
create policy "project_requests: platform admin update" on public.project_requests
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- leads: platform admins only (inserts use the service role, which bypasses RLS)
create policy "leads: platform admin read" on public.leads
  for select using (public.is_platform_admin());

-- audit_logs
create policy "audit: members read" on public.audit_logs
  for select using ((org_id is not null and public.is_org_member(org_id)) or public.is_platform_admin());
create policy "audit: members insert own" on public.audit_logs
  for insert with check (actor_id = auth.uid() and org_id is not null and public.is_org_member(org_id));

-- keep agents.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger agents_touch before update on public.agents
  for each row execute function public.touch_updated_at();
