export default function BlogHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Inkwell
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">博客首页占位</h1>
      <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
        当前项目已经切换为 Inkwell 的基础结构。后续会在这里接入文章列表、搜索、SEO 与主题系统。
      </p>
    </main>
  );
}
