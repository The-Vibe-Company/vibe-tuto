export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicTutorialViewer } from '@/components/public/PublicTutorialViewer';
import { getPublicTutorialByToken } from '@/lib/queries/public-tutorials';

interface PageProps {
  params: Promise<{ token: string }>;
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
  const isLinkOnly = tutorial.visibility === 'link_only';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const pageUrl = `${baseUrl}/t/${token}`;
  const imageUrl =
    (data.previewImageUrl ? new URL(data.previewImageUrl, baseUrl).toString() : null) ||
    `${baseUrl}/api/og/tutorial?title=${encodeURIComponent(tutorial.title)}&steps=${data.steps.length}`;
  const description = tutorial.description || `Step-by-step tutorial: ${tutorial.title}`;

  return {
    title: tutorial.title,
    description,
    // Don't index link_only tutorials
    robots: isLinkOnly ? 'noindex, nofollow' : 'index, follow',
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
    alternates: {
      types: {
        'application/json+oembed': `${baseUrl}/api/oembed?url=${encodeURIComponent(pageUrl)}&format=json`,
      },
    },
  };
}

export default async function PublicTutorialPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getPublicTutorialByToken(token);

  if (!data) {
    notFound();
  }

  const { tutorial, steps } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const shareUrl = `${baseUrl}/t/${token}`;

  return (
    <PublicTutorialViewer
      tutorial={tutorial}
      steps={steps}
      shareUrl={shareUrl}
    />
  );
}
