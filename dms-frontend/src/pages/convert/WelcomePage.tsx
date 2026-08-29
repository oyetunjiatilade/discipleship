import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, HeartHandshake, Users, Award, ArrowRight, Sparkles } from 'lucide-react';

const expectations = [
  { icon: PlayCircle, title: 'Short lessons', text: 'Watch or read a lesson, then take a quick quiz to lock it in.' },
  { icon: HeartHandshake, title: 'A mentor for you', text: "Someone from the team will walk alongside you — you're not doing this alone." },
  { icon: Users, title: 'Your class group', text: 'Pray, share, and encourage others going through the class with you.' },
  { icon: Award, title: 'Finish strong', text: 'Complete the Believers Class and earn your certificate of completion.' },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const firstName = useAuthStore((s) => s.user?.firstName);
  const setJustRegistered = useAuthStore((s) => s.setJustRegistered);

  useEffect(() => {
    setJustRegistered(false);
  }, [setJustRegistered]);

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-2xl bg-brand-800 p-6 text-center text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700">
          <Sparkles className="h-7 w-7 text-accent-400" />
        </div>
        <h1 className="font-display text-2xl font-bold">Welcome{firstName ? `, ${firstName}` : ''}! 🎉</h1>
        <p className="mt-2 text-sm text-brand-100">
          We're so glad you're here. This is the beginning of your discipleship journey with Team Barnabas.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-brand-800">What to expect</h2>
        <div className="space-y-3">
          {expectations.map((e) => (
            <Card key={e.title}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <e.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Button className="w-full gap-2" onClick={() => navigate('/lessons', { replace: true })}>
          Start my first lesson <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
          Go to my dashboard
        </Button>
      </div>
    </div>
  );
}
