export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <div className="text-display text-danger">{code ?? 'Error'}</div>
        <p className="mt-2 text-body text-text-secondary">
          {code === '403' ? "You don't have access to this resource." : 'Something went wrong.'}
        </p>
        <a href="/" className="mt-4 inline-block text-body-sm text-accent hover:underline">
          ← Back to dashboard
        </a>
      </div>
    </div>
  );
}
