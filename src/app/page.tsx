import { CommandCenterLayout } from '@/components/layout/CommandCenterLayout';

// Disable static generation for this page due to 3D components
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="h-full w-full">
      <CommandCenterLayout />
    </main>
  );
}
