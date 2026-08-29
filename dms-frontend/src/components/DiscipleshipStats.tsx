import { Card, CardContent } from '@/components/ui/card';
import type { DiscipleshipStats } from '@/types/models';
import {
  Users, PhoneCall, GraduationCap, CheckCircle2, Droplets, UserCheck, AlertTriangle,
} from 'lucide-react';

const countCards = (s: DiscipleshipStats) => [
  { label: 'Total Converts', value: s.counts.total, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50', sub: undefined as string | undefined },
  { label: 'Contacted / Reached', value: s.counts.contacted, icon: PhoneCall, color: 'text-sky-500', bg: 'bg-sky-50', sub: `${s.counts.contactedThisWeek} this week` },
  { label: 'Attended Class', value: s.counts.attended, icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-50', sub: undefined },
  { label: 'Completed Class', value: s.counts.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: undefined },
  { label: 'Baptized', value: s.counts.baptized, icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: undefined },
  { label: 'Integrated / Transferred', value: s.counts.integrated, icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-50', sub: undefined },
  { label: 'Outstanding', value: s.counts.outstanding, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50', sub: 'yet to finish the journey' },
];

export function FunnelCounts({ stats }: { stats: DiscipleshipStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {countCards(stats).map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display text-xl font-bold text-gray-900">{c.value}</p>
              {c.sub && <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const rateCards = (s: DiscipleshipStats) => [
  { label: 'Class Attendance Rate', value: s.rates.classAttendance, desc: 'Attended ÷ Total Converts' },
  { label: 'Class Completion Rate', value: s.rates.classCompletion, desc: 'Completed ÷ Attended' },
  { label: 'Baptism Rate', value: s.rates.baptism, desc: 'Baptized ÷ Completed' },
  { label: 'Attrition Rate', value: s.rates.attrition, desc: '(Total − Integrated) ÷ Total', bad: true },
  { label: 'Overall Discipleship Rate', value: s.rates.overall, desc: 'Integrated ÷ Total' },
];

function rateColor(v: number, bad?: boolean): string {
  if (bad) return v >= 60 ? 'text-rose-600' : v >= 30 ? 'text-amber-600' : 'text-emerald-600';
  return v >= 70 ? 'text-emerald-600' : v >= 40 ? 'text-amber-600' : 'text-rose-600';
}

export function FunnelRates({ stats }: { stats: DiscipleshipStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {rateCards(stats).map((r) => (
        <Card key={r.label}>
          <CardContent className="p-4 text-center">
            <p className={`font-display text-2xl font-bold ${rateColor(r.value, r.bad)}`}>{r.value}%</p>
            <p className="mt-1 text-xs font-medium text-gray-700">{r.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{r.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
