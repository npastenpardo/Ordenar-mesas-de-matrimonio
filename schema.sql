-- Pegar en Supabase > SQL Editor > New query > Run.
-- Guardado centralizado: el navegador jamás accede directamente a esta tabla.
create table if not exists public.mesas_estado (
  id integer primary key check (id = 1),
  version bigint not null default 0,
  data jsonb not null,
  actualizado_en timestamptz not null default now()
);

alter table public.mesas_estado enable row level security;
-- Sin policies: nadie accede como anon/authenticated.
-- Las funciones de Vercel usan la clave secreta del servidor.

insert into public.mesas_estado (id, version, data)
values (1, 0, '{"guests":[],"tables":[{"id":"t1","number":1,"capacity":10},{"id":"t2","number":2,"capacity":10},{"id":"t3","number":3,"capacity":10},{"id":"t4","number":4,"capacity":10},{"id":"t5","number":5,"capacity":10}],"nextGuest":1,"nextTable":6}'::jsonb)
on conflict (id) do nothing;

create or replace function public.actualizar_mesas_si_version(expected_version bigint, new_data jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare new_version bigint;
begin
  update public.mesas_estado
  set data = new_data, version = version + 1, actualizado_en = now()
  where id = 1 and version = expected_version
  returning version into new_version;
  return coalesce(new_version, -1);
end;
$$;

revoke all on function public.actualizar_mesas_si_version(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.actualizar_mesas_si_version(bigint, jsonb) to service_role;
