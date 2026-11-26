\set ON_ERROR_STOP 0
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
set role authenticated;
-- user A creates org
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select public.create_organization('Alpha Salon','salons','business') is not null as a_created;
insert into agents(org_id,name,template) select id,'A Receptionist','customer_service' from organizations;
-- user B creates org
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select public.create_organization('Beta Factory','factories','enterprise') is not null as b_created;
select count(*) as b_sees_orgs from organizations;           -- expect 1
select count(*) as b_sees_agents from agents;                -- expect 0
-- B tries to inject an agent into A's org
insert into agents(org_id,name,template) select id,'evil','x' from organizations where name='Alpha Salon'; -- expect 0 rows (cannot see)
insert into agents(org_id,name,template) values ((select id from organizations limit 1),'B ok','sales');
-- B tries privilege escalation
update profiles set is_platform_admin = true where id = auth.uid();   -- expect permission denied
update organizations set plan='enterprise';                           -- expect permission denied
update organizations set name='Beta Factory LLC';                     -- expect UPDATE 1
-- B tries to add itself to A's org via membership
reset role;
select id as a_org from organizations where name='Alpha Salon' \gset
set role authenticated;
insert into memberships(org_id,user_id,role) values (:'a_org','00000000-0000-0000-0000-00000000000b','owner'); -- expect RLS violation
select count(*) as b_project_insert_ok from (select 1) x;
insert into project_requests(org_id,submitted_by,contact_name,contact_email,company,industry,goals) values (:'a_org','00000000-0000-0000-0000-00000000000b','x','x@x','x','x','x'); -- expect RLS violation
select count(*) as b_sees_leads from leads;  -- 0
-- anon sees nothing
select set_config('request.jwt.claim.sub','',false);
select count(*) as anon_orgs from organizations;
reset role;
select name, (select count(*) from agents a where a.org_id=o.id) agents, plan from organizations o order by name;
