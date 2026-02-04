import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MousePointer2, Sparkles, FileText, ArrowRight, Play, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-stone-900">Vibe Tuto</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-stone-600 hover:text-stone-900">
                Se connecter
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-stone-900 text-white hover:bg-stone-800">
                Commencer
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-violet-50/80 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/4 -translate-x-1/4 rounded-full bg-stone-50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/50 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-700">Créez des tutoriels en quelques clics</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-6xl">
              Transformez vos actions en{" "}
              <span className="relative">
                <span className="relative z-10 text-violet-600">tutoriels</span>
                <span className="absolute bottom-2 left-0 -z-0 h-3 w-full bg-violet-100/70" />
              </span>{" "}
              interactifs
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mb-10 max-w-xl text-lg text-stone-500 leading-relaxed">
              Enregistrez vos clics, générez automatiquement des instructions claires,
              et partagez des guides visuels que tout le monde peut suivre.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button size="lg" className="group h-12 bg-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-violet-200 hover:bg-violet-700">
                  Créer mon premier tutoriel
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium border-stone-200 text-stone-600 hover:bg-stone-50">
                <Play className="mr-2 h-4 w-4" />
                Voir une démo
              </Button>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="relative mt-20">
            <div className="relative mx-auto max-w-4xl">
              {/* Browser mockup */}
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl shadow-stone-200/50">
                {/* Browser header */}
                <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-stone-300" />
                    <div className="h-3 w-3 rounded-full bg-stone-300" />
                    <div className="h-3 w-3 rounded-full bg-stone-300" />
                  </div>
                  <div className="ml-4 flex-1 rounded-md bg-stone-100 px-3 py-1.5">
                    <span className="text-xs text-stone-400">app.vibetuto.com/editor</span>
                  </div>
                </div>
                {/* Preview content */}
                <div className="aspect-[16/9] bg-gradient-to-br from-stone-50 to-stone-100 p-8">
                  <div className="flex h-full gap-6">
                    {/* Sidebar mockup */}
                    <div className="w-48 space-y-3 rounded-lg border border-stone-200 bg-white p-4">
                      <div className="h-3 w-20 rounded bg-stone-200" />
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-2 rounded-md bg-stone-50 p-2">
                            <div className="h-8 w-8 rounded bg-violet-100" />
                            <div className="h-2 w-16 rounded bg-stone-200" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Main content mockup */}
                    <div className="flex-1 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-medium text-white">1</div>
                        <div className="h-3 w-48 rounded bg-stone-200" />
                      </div>
                      <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 p-4">
                        <div className="relative h-full rounded bg-white/50">
                          {/* Click indicator */}
                          <div className="absolute left-1/3 top-1/2 flex h-8 w-8 items-center justify-center">
                            <div className="absolute h-8 w-8 animate-ping rounded-full bg-violet-400/30" />
                            <MousePointer2 className="h-5 w-5 text-violet-500" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-stone-100" />
                        <div className="h-2 w-3/4 rounded bg-stone-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -left-6 top-1/4 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
                <MousePointer2 className="h-5 w-5 text-violet-500" />
              </div>
              <div className="absolute -right-6 bottom-1/3 rounded-lg border border-stone-200 bg-white p-3 shadow-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-stone-100 bg-stone-50/50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">Fonctionnalités</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Tout ce qu&apos;il faut pour créer<br />des tutoriels parfaits
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: MousePointer2,
                title: "Capture automatique",
                description: "Enregistrez vos clics et navigations. Chaque action est capturée avec une capture d'écran haute qualité.",
                color: "violet"
              },
              {
                icon: Sparkles,
                title: "Instructions IA",
                description: "L'intelligence artificielle génère automatiquement des instructions claires à partir de vos actions.",
                color: "amber"
              },
              {
                icon: FileText,
                title: "Éditeur intuitif",
                description: "Personnalisez, réorganisez et annotez vos étapes avec un éditeur simple et puissant.",
                color: "emerald"
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-stone-200 bg-white p-8 transition-all hover:border-stone-300 hover:shadow-lg"
              >
                <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                  feature.color === 'violet' ? 'bg-violet-100 text-violet-600' :
                  feature.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-stone-900">{feature.title}</h3>
                <p className="text-stone-500 leading-relaxed">{feature.description}</p>
                <ChevronRight className="absolute bottom-8 right-8 h-5 w-5 text-stone-300 transition-all group-hover:translate-x-1 group-hover:text-violet-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-600">Comment ça marche</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Trois étapes simples
            </h2>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-24 left-1/2 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-violet-200 via-violet-300 to-violet-200 md:block" />

            <div className="grid gap-12 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Installez l'extension",
                  description: "Ajoutez notre extension Chrome et connectez-vous à votre compte."
                },
                {
                  step: "02",
                  title: "Enregistrez vos actions",
                  description: "Cliquez sur Enregistrer et effectuez les actions que vous voulez documenter."
                },
                {
                  step: "03",
                  title: "Publiez votre tutoriel",
                  description: "Éditez si besoin et partagez votre tutoriel en un clic."
                }
              ].map((item, i) => (
                <div key={i} className="relative text-center">
                  <div className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-violet-200 bg-white text-2xl font-semibold text-violet-600 shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-stone-900">{item.title}</h3>
                  <p className="mx-auto max-w-xs text-stone-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link href="/login">
              <Button size="lg" className="group h-12 bg-stone-900 px-8 text-base font-medium text-white hover:bg-stone-800">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 bg-stone-50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600">
                <Play className="h-4 w-4 fill-white text-white" />
              </div>
              <span className="text-lg font-semibold text-stone-900">Vibe Tuto</span>
            </div>
            <p className="text-sm text-stone-500">
              © {new Date().getFullYear()} The Vibe Company. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-stone-500 hover:text-stone-900">Confidentialité</Link>
              <Link href="#" className="text-sm text-stone-500 hover:text-stone-900">Conditions</Link>
              <Link href="#" className="text-sm text-stone-500 hover:text-stone-900">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
