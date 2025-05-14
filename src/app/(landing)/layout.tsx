import { Header } from '@/components/layout/header';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
