import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicTutorialViewer } from '@/components/public/PublicTutorialViewer';
import { getPublicTutorialBySlug } from '@/lib/queries/public-tutorials';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicTutorialBySlug(slug);

  if (!data) {
    return {
      title: 'Tutorial Not Found',
    };
  }

  const { tutorial } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';

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
      publishedTime: tutorial.publishedAt ?? undefined,
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
  const data = await getPublicTutorialBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const shareUrl = `${baseUrl}/tutorial/${slug}`;

  return (
    <PublicTutorialViewer
      tutorial={tutorial}
      steps={steps}
      shareUrl={shareUrl}
    />
  );
}
