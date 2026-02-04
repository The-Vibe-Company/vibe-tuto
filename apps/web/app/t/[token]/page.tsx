import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicTutorialViewer } from '@/components/public/PublicTutorialViewer';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getPublicTutorial(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/public/tutorials/token/${token}`, {
    cache: 'no-store', // Don't cache to ensure fresh data
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
  const isLinkOnly = tutorial.visibility === 'link_only';

  return {
    title: tutorial.title,
    description: tutorial.description || `Tutorial: ${tutorial.title}`,
    // Don't index link_only tutorials
    robots: isLinkOnly ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title: tutorial.title,
      description: tutorial.description || `Tutorial: ${tutorial.title}`,
      type: 'article',
      publishedTime: tutorial.publishedAt,
    },
  };
}

export default async function PublicTutorialPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getPublicTutorial(token);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/t/${token}`;

  return (
    <PublicTutorialViewer
      tutorial={tutorial}
      steps={steps}
      shareUrl={shareUrl}
    />
  );
}
