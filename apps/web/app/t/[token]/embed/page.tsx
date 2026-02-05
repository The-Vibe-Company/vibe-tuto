import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { EmbedTutorialViewer } from '@/components/public/EmbedTutorialViewer';
import { getPublicTutorialByToken } from '@/lib/queries/public-tutorials';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicTutorialByToken(token);

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
  const data = await getPublicTutorialByToken(token);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const fullTutorialUrl = `${baseUrl}/t/${token}`;

  // Apply theme class if specified
  const themeClass = theme === 'dark' ? 'dark' : '';

  return (
    <div className={themeClass}>
      <EmbedTutorialViewer
        tutorial={tutorial}
        steps={steps}
        shareUrl={fullTutorialUrl}
      />
    </div>
  );
}
