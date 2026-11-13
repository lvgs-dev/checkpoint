-- The migration runner supplies one transaction for this file.
ALTER FUNCTION public.immutable_unaccent(text) SET search_path = '';

ALTER FUNCTION public.norm_key(text)           SET search_path = '';

ALTER FUNCTION public.slugify(text)            SET search_path = '';

ALTER FUNCTION public.trg_touch_updated_at()   SET search_path = public, extensions;

ALTER FUNCTION public.trg_game_before_write()  SET search_path = public, extensions;

ALTER FUNCTION public.trg_library_entry_fill() SET search_path = public, extensions;

ALTER FUNCTION public.apply_queue_move(uuid, bigint, integer, integer, numeric, text, uuid, bigint, numeric, bigint)
  SET search_path = public, extensions;

ALTER FUNCTION public.reset_queue_adjustments(uuid, bigint) SET search_path = public, extensions;
