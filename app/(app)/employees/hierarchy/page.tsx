import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { getHierarchy, type HierarchyNode } from '@/lib/server/data/org';
import { roleLabel } from '@/lib/roles';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/states';
import type { Role } from '@/types/enums';

export const metadata = { title: 'Reporting hierarchy — Sarion Team OS' };

export default async function HierarchyPage() {
  await requirePermission('user:read');
  const roots = await getHierarchy();

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <Link href="/employees" className="mb-3 inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
      </Link>
      <PageHeader title="Reporting hierarchy" subtitle="Who reports to whom, built from each person’s manager." />

      {roots.length === 0 ? (
        <EmptyState icon={GitBranch} title="No hierarchy yet" description="Assign managers on employee profiles to build the org tree." />
      ) : (
        <Card>
          <CardContent className="space-y-1">
            {roots.map((node) => <Node key={node.id} node={node} depth={0} />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Node({ node, depth }: { node: HierarchyNode; depth: number }) {
  return (
    <div>
      <Link
        href={`/employees/${node.id}`}
        className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-white/[0.03]"
        style={{ marginLeft: depth * 22 }}
      >
        {depth > 0 && <span className="text-text-muted">↳</span>}
        <Avatar name={node.full_name} src={node.avatar_url} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-text">{node.full_name}</p>
          <p className="truncate text-caption text-text-muted">{node.designation ?? roleLabel(node.role as Role)}</p>
        </div>
        <Badge tone="outline">{roleLabel(node.role as Role)}</Badge>
        {node.reports.length > 0 && <Badge tone="neutral">{node.reports.length}</Badge>}
      </Link>
      {node.reports.map((child) => <Node key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}
