import Link from 'next/link';
import { Play, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-stone-900">
            CapTuto
          </span>
        </div>

        {/* 404 Message */}
        <h1 className="text-8xl font-bold text-violet-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Page introuvable
        </h2>
        <p className="text-gray-600 mb-8">
          Oups ! La page que vous cherchez n'existe pas ou a ete deplacee.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Mes tutoriels
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-gray-500">
          Besoin d'aide ?{' '}
          <Link href="/#faq" className="text-violet-600 hover:underline">
            Consultez notre FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
