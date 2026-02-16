import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-sky-50 font-sans text-sky-950">
      <section className="relative overflow-hidden border-b border-sky-200/70">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(249,115,22,0.15),transparent_40%)]"
          aria-hidden
        />
        <div className="container relative py-6 md:py-8">
          <div className="flex items-center justify-between">
            <p className="font-heading text-xl font-bold tracking-tight">Vibe Tuto</p>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="container relative pb-16 pt-12 md:pb-24 md:pt-20">
          <Badge className="mb-5 bg-sky-100 text-sky-900 hover:bg-sky-100">
            New workflow for tutorial teams
          </Badge>
          <h1 className="font-heading max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Build polished tutorials in 3 minutes.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-sky-900/80 md:text-lg">
            Vibe Tuto turns rough captures into clear, step-by-step guides your
            users can follow instantly.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="cursor-pointer bg-orange-500 text-white hover:bg-orange-600">
              <Link href="/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="cursor-pointer border-sky-300 bg-white/80 hover:bg-white">
              <Link href="/support">View help center</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="grid grid-cols-1 gap-3 text-center md:grid-cols-3">
          <Card className="border-sky-200/80 bg-white/85 shadow-sm">
            <CardContent className="py-6">
              <p className="font-heading text-3xl font-bold">2,000+</p>
              <p className="mt-1 text-sm text-sky-900/70">tutorials shipped</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-white/85 shadow-sm">
            <CardContent className="py-6">
              <p className="font-heading text-3xl font-bold">65%</p>
              <p className="mt-1 text-sm text-sky-900/70">less production time</p>
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-white/85 shadow-sm">
            <CardContent className="py-6">
              <p className="font-heading text-3xl font-bold">4.9/5</p>
              <p className="mt-1 text-sm text-sky-900/70">average team rating</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container pb-14 md:pb-20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-sky-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <Sparkles className="size-5 text-sky-700" />
              <CardTitle className="font-heading text-xl">
                Auto script
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-sky-900/75">
              Convert rough notes into clean tutorial copy with one click.
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <Timer className="size-5 text-sky-700" />
              <CardTitle className="font-heading text-xl">
                Fast capture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-sky-900/75">
              Record only what matters and skip repetitive setup work.
            </CardContent>
          </Card>
          <Card className="border-sky-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CheckCircle2 className="size-5 text-sky-700" />
              <CardTitle className="font-heading text-xl">
                Instant export
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-sky-900/75">
              Publish a shareable guide in your help center in minutes.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-sky-200/70 bg-white/70">
        <div className="container py-14 text-center md:py-20">
          <h2 className="font-heading text-3xl font-bold md:text-5xl">
            Ready to ship your next tutorial faster?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sky-900/75">
            Join teams using Vibe Tuto to teach users with clarity and speed.
          </p>
          <div className="mt-7">
            <Button asChild size="lg" className="cursor-pointer bg-orange-500 text-white hover:bg-orange-600">
              <Link href="/signup">Create your first tutorial</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
