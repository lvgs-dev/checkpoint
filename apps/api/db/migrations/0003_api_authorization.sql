-- Authorization runs in the API. No database identity or client roles are installed.
ALTER VIEW public.library_card SET (security_invoker = on);
ALTER VIEW public.queue_freshness SET (security_invoker = on);
