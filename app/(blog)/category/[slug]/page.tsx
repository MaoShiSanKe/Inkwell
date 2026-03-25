type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Category
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">分类页占位</h1>
      <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
        当前分类 slug：<code className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{slug}</code>
      </p>
    </main>
  );
}
