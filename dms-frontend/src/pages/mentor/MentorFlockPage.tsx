import { useNavigate } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { mentorApi } from '@/api/mentorApi';
import { FlockList } from '@/components/FlockList';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';

export default function MentorFlockPage() {
  const navigate = useNavigate();
  const { data: flock, loading, error, refetch } = useAsync(() => mentorApi.getFlock());

  const needAttention = (flock || []).filter((m) => m.status === 'dark' || m.status === 'stuck').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-brand-800">People I'm walking with</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${flock?.length || 0} assigned · ${needAttention} need a check-in`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
            <button onClick={refetch} className="text-sm font-medium text-red-600 underline">Retry</button>
          </CardContent>
        </Card>
      ) : (
        <FlockList members={flock || []} onSelect={(id) => navigate(`/mentor/converts/${id}`)} />
      )}
    </div>
  );
}
