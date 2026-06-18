'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { updateOwnAvatar } from '@/lib/actions/employees';
import { Avatar } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function AvatarUpload({
  userId,
  name,
  currentUrl,
}: {
  userId: string;
  name: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onPick = async (file: File) => {
    if (!ALLOWED.includes(file.type)) { toast.error('Use a JPG, PNG, WEBP or GIF image.'); return; }
    if (file.size > MAX_BYTES) { toast.error('Image must be 2 MB or smaller.'); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) { toast.error(upErr.message); return; }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const res = await updateOwnAvatar(pub.publicUrl);
      if (!res.ok) { toast.error(res.error); return; }
      setUrl(pub.publicUrl);
      toast.success('Photo updated');
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = () =>
    start(async () => {
      const res = await updateOwnAvatar(null);
      if (!res.ok) { toast.error(res.error); return; }
      setUrl(null);
      toast.success('Photo removed');
      router.refresh();
    });

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={url} size={64} />
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(',')}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); }}
          />
          <Button variant="secondary" size="sm" disabled={uploading || pending} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : url ? 'Change photo' : 'Upload photo'}
          </Button>
          {url && (
            <Button variant="ghost" size="sm" disabled={uploading || pending} onClick={remove}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-caption text-text-muted">JPG, PNG, WEBP or GIF · up to 2 MB</p>
      </div>
    </div>
  );
}
