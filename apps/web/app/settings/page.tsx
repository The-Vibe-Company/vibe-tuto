'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Bell, Shield, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const [activeTab] = useState('profile');

  const settingsSections = [
    {
      id: 'profile',
      icon: User,
      title: 'Profil',
      description: 'Gerez vos informations personnelles',
      comingSoon: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Configurez vos preferences de notification',
      comingSoon: true,
    },
    {
      id: 'security',
      icon: Shield,
      title: 'Securite',
      description: 'Mot de passe et authentification',
      comingSoon: true,
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Apparence',
      description: 'Theme et personnalisation',
      comingSoon: true,
    },
  ];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au dashboard
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerez vos preferences et parametres de compte
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className={`relative overflow-hidden transition-all hover:shadow-md ${
                section.comingSoon ? 'opacity-75' : 'cursor-pointer'
              }`}
            >
              {section.comingSoon && (
                <div className="absolute right-2 top-2">
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-600">
                    Bientot disponible
                  </span>
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info box */}
      <Card className="mt-8 border-violet-200 bg-violet-50">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
            <Bell className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-medium text-violet-900">
              Les parametres arrivent bientot !
            </h3>
            <p className="mt-1 text-sm text-violet-700">
              Nous travaillons activement sur la page de parametres pour vous offrir
              une experience personnalisee. Restez a l'ecoute pour les mises a jour.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
