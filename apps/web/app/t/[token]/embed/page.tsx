import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicTutorialViewer } from '@/components/public/PublicTutorialViewer';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}

async function getPublicTutorial(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/public/tutorials/token/${token}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicTutorial(token);

  if (!data) {
    return {
      title: 'Tutorial Not Found',
    };
  }

  const { tutorial } = data;

  return {
    title: tutorial.title,
    description: tutorial.description || `Tutorial: ${tutorial.title}`,
    // Don't index embed pages
    robots: 'noindex, nofollow',
  };
}

export default async function EmbedTutorialPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { theme } = await searchParams;
  const data = await getPublicTutorial(token);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const fullTutorialUrl = `${baseUrl}/t/${token}`;

  // Apply theme class if specified
  const themeClass = theme === 'dark' ? 'dark' : '';

  return (
    <div className={themeClass}>
      <PublicTutorialViewer
        tutorial={tutorial}
        steps={steps}
        shareUrl={fullTutorialUrl}
        isEmbed
      />
    </div>
  );
}
