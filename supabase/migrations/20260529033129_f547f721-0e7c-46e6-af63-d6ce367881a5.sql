-- App roles enum
create type public.app_role as enum ('admin', 'user');

-- user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- security definer: avoid RLS recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Users can read their own roles; admins can read everything
create policy "users read own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "admins read all roles"
on public.user_roles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Only admins manage roles (writes)
create policy "admins insert roles"
on public.user_roles for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "admins update roles"
on public.user_roles for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "admins delete roles"
on public.user_roles for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: first registered user automatically becomes admin
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_assign_role
after insert on auth.users
for each row execute function public.bootstrap_first_admin();