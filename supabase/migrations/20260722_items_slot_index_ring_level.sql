-- Equipment-window arrangement + leveled-ring support.
alter table public.items add column if not exists slot_index integer;
alter table public.items add column if not exists ring_level integer;
