'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { setOutreach, type OutreachField } from '@/lib/actions/leads';

type FieldKey = OutreachField | 'cold_email_opened';

interface ChannelDef { title: string; steps: { key: FieldKey; label: string }[] }

const CHANNELS: ChannelDef[] = [
  { title: 'LinkedIn', steps: [
    { key: 'li_requested_at', label: 'Connection requested' },
    { key: 'li_connected_at', label: 'Connected' },
    { key: 'li_first_msg_at', label: 'First message' },
  ]},
  { title: 'Cold Email', steps: [
    { key: 'cold_email_sent_at', label: 'Sent' },
    { key: 'cold_email_opened', label: 'Opened' },
    { key: 'cold_email_replied_at', label: 'Replied' },
  ]},
  { title: 'Instagram', steps: [
    { key: 'ig_dm_sent_at', label: 'DM sent' },
    { key: 'ig_replied_at', label: 'Replied' },
  ]},
  { title: 'Facebook', steps: [
    { key: 'fb_dm_sent_at', label: 'DM sent' },
    { key: 'fb_replied_at', label: 'Replied' },
  ]},
  { title: 'X (Twitter)', steps: [
    { key: 'x_dm_sent_at', label: 'DM sent' },
    { key: 'x_replied_at', label: 'Replied' },
  ]},
];

export function LeadOutreach({ leadId, lead }: { leadId: string; lead: Record<string, unknown> }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const isOn = (key: FieldKey) => key === 'cold_email_opened' ? !!lead.cold_email_opened : !!lead[key];

  const toggle = (key: FieldKey) => start(async () => {
    const res = await setOutreach(leadId, key, !isOn(key));
    if (res.ok) router.refresh();
    else toast.error(res.error);
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CHANNELS.map((ch) => (
        <div key={ch.title} className="rounded-sm border border-border bg-surface-2/50 p-3">
          <div className="mb-2 text-caption font-medium text-text-secondary">{ch.title}</div>
          <div className="flex flex-wrap gap-1.5">
            {ch.steps.map((s) => {
              const on = isOn(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(s.key)}
                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-caption transition-colors ${
                    on ? 'border-success/50 bg-success-soft text-success' : 'border-border-strong text-text-secondary hover:bg-white/[0.04]'
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}{s.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
