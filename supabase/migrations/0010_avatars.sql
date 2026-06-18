-- 0010 — Avatar photo uploads.
-- A public 'avatars' storage bucket. Each user owns the folder named after their
-- uid (avatars/<uid>/<file>). Anyone can READ (public bucket → public URLs, used
-- in <img src>), but only the owner may write/replace/delete their own files.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Authenticated users may upload into their own folder only.
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public read (covers anon + authenticated) so avatar URLs render anywhere.
create policy "avatars_read_all"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
