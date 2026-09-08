import { Zap, Eye, CheckCircle2, Users, type LucideIcon } from 'lucide-react';

interface KpiStripProps {
  tutorialsCount: number;
}

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value: string;
  delta?: { text: string; direction: 'up' | 'down' };
  sparkPath: string;
  sparkStroke: string;
}

function KpiCard({ label, icon: Icon, value, delta, sparkPath, sparkStroke }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500">
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-[32px] font-semibold leading-none tracking-tight text-stone-900">
          {value}
        </span>
        {delta && (
          <span
            className={`font-mono text-[12px] font-medium ${
              delta.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>
      <svg
        className="mt-2 h-8 w-full"
        viewBox="0 0 200 32"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={sparkPath}
          fill="none"
          stroke={sparkStroke}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function KpiStrip({ tutorialsCount }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <KpiCard
        label="Tutorials"
        icon={Zap}
        value={String(tutorialsCount)}
        sparkPath="0,24 20,22 40,20 60,18 80,15 100,17 120,12 140,14 160,9 180,11 200,4"
        sparkStroke="#4f46e5"
      />
      {/* TODO: wire real analytics — these KPIs are visual placeholders until the data layer ships. */}
      <KpiCard
        label="Total views"
        icon={Eye}
        value="—"
        sparkPath="0,28 20,26 40,22 60,24 80,18 100,15 120,18 140,10 160,12 180,6 200,8"
        sparkStroke="#14b8a6"
      />
      <KpiCard
        label="Avg. completion"
        icon={CheckCircle2}
        value="—"
        sparkPath="0,16 20,15 40,18 60,14 80,12 100,14 120,10 140,11 160,8 180,9 200,6"
        sparkStroke="#06b6d4"
      />
      <KpiCard
        label="Active editors"
        icon={Users}
        value="—"
        sparkPath="0,10 20,12 40,8 60,11 80,14 100,12 120,16 140,14 160,18 180,16 200,20"
        sparkStroke="#a8a29e"
      />
    </div>
  );
}
