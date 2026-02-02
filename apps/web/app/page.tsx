import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../components/ui/card";
import { Input } from "../components/ui/input";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Starter UI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Next.js 14 + Tailwind + shadcn/ui
          </h1>
          <p className="text-muted-foreground">
            Base setup prêt pour vos composants et votre design system.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Composants de base</CardTitle>
            <CardDescription>
              Vérifie que Tailwind et shadcn/ui fonctionnent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Input</p>
              <Input placeholder="Votre email" type="email" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="ghost">Découvrir</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
