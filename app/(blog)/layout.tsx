import { UmamiTracker } from "@/components/blog/umami-tracker";

type BlogLayoutProps = {
  children: React.ReactNode;
};

export default async function BlogLayout({ children }: BlogLayoutProps) {
  const tracker = await UmamiTracker();

  return (
    <>
      {children}
      {tracker}
    </>
  );
}
