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
      title: 'Profile',
      description: 'Manage your personal information',
      comingSoon: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Configure your notification preferences',
      comingSoon: true,
    },
    {
      id: 'security',
      icon: Shield,
      title: 'Security',
      description: 'Password and authentication',
      comingSoon: true,
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Appearance',
      description: 'Theme and customization',
      comingSoon: true,
    },
  ];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your preferences and account settings
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
                    Coming soon
                  </span>
                </div>
              )}
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                  <Icon className="h-5 w-5 text-stone-600" />
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
              Settings are coming soon!
            </h3>
            <p className="mt-1 text-sm text-violet-700">
              We are actively working on the settings page to offer you
              a personalized experience. Stay tuned for updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
