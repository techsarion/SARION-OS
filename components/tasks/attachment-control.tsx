'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, Upload, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { addAttachment, removeAttachment } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import type { TaskAttachment } from '@/lib/server/data/tasks';

function humanSize(bytes: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function AttachmentControl({ taskId, attachments }: { taskId: string; attachments: TaskAttachment[] }) {
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onPick = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `tasks/${taskId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
      if (upErr) { toast.error(upErr.message); return; }
      const res = await addAttachment(taskId, { file_name: file.name, file_path: path, file_size: file.size, content_type: file.type || 'application/octet-stream' });
      if (res.ok) { toast.success('File attached'); router.refresh(); }
      else toast.error(res.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const download = async (filePath: string, fileName: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage.from('attachments').createSignedUrl(filePath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Could not generate a download link.');
    void fileName;
  };

  const remove = (id: string, filePath: string) =>
    start(async () => {
      const res = await removeAttachment(id, taskId, filePath);
      if (res.ok) { toast.success('Attachment removed'); router.refresh(); }
      else toast.error(res.error);
    });

  return (
    <div className="space-y-2.5">
      {attachments.length === 0 ? (
        <p className="text-caption text-text-muted">No attachments yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1.5">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-text">{a.fileName}</p>
                <p className="text-caption text-text-muted">{humanSize(a.fileSize)}{a.uploaderName ? ` · ${a.uploaderName}` : ''}</p>
              </div>
              <button onClick={() => download(a.filePath, a.fileName)} aria-label="Download" className="text-text-muted hover:text-text"><Download className="h-4 w-4" /></button>
              <button onClick={() => remove(a.id, a.filePath)} disabled={pending} aria-label="Remove" className="text-text-muted hover:text-danger"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); }}
      />
      <Button variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? 'Uploading…' : (<><Upload className="h-4 w-4" /> Attach file</>)}
      </Button>
    </div>
  );
}
