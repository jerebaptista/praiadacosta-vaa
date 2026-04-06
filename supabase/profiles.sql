-- Perfis ligados ao Auth: papel (admin | aluno) e vínculo opcional com alunos.
-- Rode no SQL Editor do Supabase após já existir public.alunos.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'aluno' check (role in ('admin', 'aluno')),
  aluno_id uuid references public.alunos (id) on delete set null,
  nome_exibicao text,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_profiles_aluno on public.profiles (aluno_id);

alter table public.profiles enable row level security;

-- Evita recursão nas policies: checagem de admin com SECURITY DEFINER
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Cada usuário lê o próprio perfil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins leem qualquer perfil (útil para equipe)
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- Usuário atualiza só o próprio (campos limitados na prática pelo app)
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Insert do próprio perfil (fallback se o trigger falhar)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Linha ao registrar usuário (padrão: aluno; promova o primeiro staff manualmente)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'aluno')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tornar o primeiro usuário admin (rode uma vez, troque o e-mail):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'seu@email.com' limit 1);
