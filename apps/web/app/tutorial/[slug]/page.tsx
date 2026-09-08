export const dynamic = 'force-dynamic';
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

  const pageUrl = `${baseUrl}/tutorial/${slug}`;
  const imageUrl =
    (data.previewImageUrl ? new URL(data.previewImageUrl, baseUrl).toString() : null) ||
    `${baseUrl}/api/og/tutorial?title=${encodeURIComponent(tutorial.title)}&steps=${data.steps.length}`;
  const description = tutorial.description || `Step-by-step tutorial: ${tutorial.title}`;

  return {
    title: tutorial.title,
    description,
    robots: 'index, follow',
    alternates: {
      canonical: pageUrl,
      types: {
        'application/json+oembed': `${baseUrl}/api/oembed?url=${encodeURIComponent(pageUrl)}&format=json`,
      },
    },
    openGraph: {
      title: tutorial.title,
      description,
      type: 'article',
      publishedTime: tutorial.publishedAt ?? undefined,
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${tutorial.title} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tutorial.title,
      description,
      images: [imageUrl],
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
