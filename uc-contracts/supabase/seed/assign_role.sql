-- UC CONTRACTS — Atribuir papel a um usuário interno
-- Use este script no SQL Editor do Supabase DEPOIS de convidar a pessoa em
-- Authentication → Users → Invite user (isso cria o registro em auth.users).
--
-- PASSO A PASSO:
-- 1) Troque 'pessoa@ucnadv.com' pelo e-mail que você convidou.
-- 2) Troque 'legal' pelo papel desejado: master_admin | legal | hr | finance | manager | internal_client | viewer
-- 3) Se o papel NÃO for master_admin, troque 'multicorp' pelo slug da empresa correta
--    (multicorp | triade | centro-tea | rf | holding).
-- 4) Rode o script.

do $$
declare
  v_user_id uuid;
  v_role_id uuid;
  v_email text := 'pessoa@ucnadv.com';
  v_role_name text := 'legal';
  v_company_slug text := 'multicorp';
begin
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'Usuário % não encontrado. Convide-o primeiro em Authentication → Users.', v_email;
  end if;

  select id into v_role_id from roles where name = v_role_name;
  if v_role_id is null then
    raise exception 'Papel % não existe.', v_role_name;
  end if;

  if v_role_name = 'master_admin' then
    -- Master Admin recebe acesso em todas as empresas da holding
    insert into user_roles (user_id, role_id, company_id)
    select v_user_id, v_role_id, id from companies
    on conflict do nothing;
  else
    insert into user_roles (user_id, role_id, company_id)
    select v_user_id, v_role_id, id from companies where slug = v_company_slug
    on conflict do nothing;
  end if;
end $$;
