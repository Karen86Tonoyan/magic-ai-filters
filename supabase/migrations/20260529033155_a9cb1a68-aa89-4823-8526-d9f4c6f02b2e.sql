revoke execute on function public.bootstrap_first_admin() from anon, authenticated, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;