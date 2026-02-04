import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicTutorialViewer } from '@/components/public/PublicTutorialViewer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPublicTutorial(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/public/tutorials/slug/${slug}`, {
    cache: 'no-store', // Don't cache to ensure fresh data
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicTutorial(slug);

  if (!data) {
    return {
      title: 'Tutorial Not Found',
    };
  }

  const { tutorial } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: tutorial.title,
    description: tutorial.description || `Tutorial: ${tutorial.title}`,
    robots: 'index, follow',
    alternates: {
      canonical: `${baseUrl}/tutorial/${slug}`,
    },
    openGraph: {
      title: tutorial.title,
      description: tutorial.description || `Tutorial: ${tutorial.title}`,
      type: 'article',
      publishedTime: tutorial.publishedAt,
      url: `${baseUrl}/tutorial/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: tutorial.title,
      description: tutorial.description || `Tutorial: ${tutorial.title}`,
    },
  };
}

export default async function PublicTutorialBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicTutorial(slug);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/tutorial/${slug}`;

  return (
    <PublicTutorialViewer
      tutorial={tutorial}
      steps={steps}
      shareUrl={shareUrl}
    />
  );
}
