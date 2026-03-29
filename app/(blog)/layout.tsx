import { ThemeToggle } from "@/components/theme-toggle";
import { UmamiTracker } from "@/components/blog/umami-tracker";

type BlogLayoutProps = {
  children: React.ReactNode;
};

export default async function BlogLayout({ children }: BlogLayoutProps) {
  const tracker = await UmamiTracker();

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl justify-end px-6 pt-6">
        <ThemeToggle />
      </div>
      {children}
      {tracker}
    </>
  );
}
