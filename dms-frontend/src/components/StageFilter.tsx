import {
  DiscipleshipStage,
  STAGE_LABELS,
  STAGE_ORDER,
} from '@/constants/enums';
import { cn } from '@/lib/utils';
import { Filter, X } from 'lucide-react';

interface StageFilterProps {
  value: DiscipleshipStage | undefined;
  onChange: (stage: DiscipleshipStage | undefined) => void;
  /** Whether to include HOLY_SPIRIT_FILLED in the list (default: true) */
  includeHolySpiritFilled?: boolean;
  className?: string;
}

const allStages: DiscipleshipStage[] = [
  ...STAGE_ORDER.slice(0, 1),
  DiscipleshipStage.HOLY_SPIRIT_FILLED,
  ...STAGE_ORDER.slice(1),
];

export function StageFilter({
  value,
  onChange,
  includeHolySpiritFilled = true,
  className,
}: StageFilterProps) {
  const stages = includeHolySpiritFilled
    ? allStages
    : STAGE_ORDER;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="mr-1 flex items-center gap-1 text-xs font-medium text-gray-500">
        <Filter className="h-3 w-3" />
        Stage:
      </span>

      {/* All option */}
      <button
        onClick={() => onChange(undefined)}
        className={cn(
          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          !value
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
        )}
      >
        All
      </button>

      {stages.map((stage) => (
        <button
          key={stage}
          onClick={() => onChange(stage === value ? undefined : stage)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            stage === value
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          {STAGE_LABELS[stage]}
          {stage === value && (
            <X className="ml-1 inline h-3 w-3" />
          )}
        </button>
      ))}
    </div>
  );
}
