-- Run this AFTER creating your first user in Supabase Auth
-- (Authentication -> Users -> Add user, email: <username>@emirz.local).
-- Replace the two placeholders below, then run in the SQL editor.

insert into public.profiles (id, store_id, username, display_name, role)
values (
  'PASTE-THE-NEW-USER-UUID-HERE',
  '00000000-0000-0000-0000-000000000001',
  'manager',              -- the username you'll type on the EMIRZ stoRe login screen
  'Manager',              -- display name shown in the sidebar
  'manager'
);
