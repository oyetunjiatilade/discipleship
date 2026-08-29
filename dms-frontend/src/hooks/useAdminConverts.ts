import { useState, useCallback, useEffect, useRef } from 'react';
import { adminApi, type ConvertReportFilters } from '@/api/adminApi';
import type { ConvertReportRow, StageSummary } from '@/types/models';
import type { PaginationMeta } from '@/types/api';
import type { DiscipleshipStage } from '@/constants/enums';

interface UseAdminConvertsState {
  converts: ConvertReportRow[];
  summary: {
    totalConverts: number;
    stageBreakdown: StageSummary[];
    averageCompletion: number;
  } | null;
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

interface UseAdminConvertsReturn extends UseAdminConvertsState {
  // Filter setters
  setStage: (stage: DiscipleshipStage | undefined) => void;
  setSearch: (search: string) => void;
  setGender: (gender: 'male' | 'female' | undefined) => void;
  setBranchId: (branchId: string | undefined) => void;
  setPage: (page: number) => void;
  setDateRange: (from: string | undefined, to: string | undefined) => void;
  // Current filter values
  filters: ConvertReportFilters;
  // Actions
  refetch: () => Promise<void>;
  downloadCsv: () => Promise<void>;
  csvLoading: boolean;
}

export function useAdminConverts(initialLimit = 20): UseAdminConvertsReturn {
  const [filters, setFilters] = useState<ConvertReportFilters>({
    page: 1,
    limit: initialLimit,
  });
  const [state, setState] = useState<UseAdminConvertsState>({
    converts: [],
    summary: null,
    meta: null,
    loading: true,
    error: null,
  });
  const [csvLoading, setCsvLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await adminApi.getConvertReport(filters);
      if (mountedRef.current) {
        setState({
          converts: result.data.converts,
          summary: result.data.summary,
          meta: result.meta,
          loading: false,
          error: null,
        });
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err?.response?.data?.error?.message || 'Failed to load converts',
        }));
      }
    }
  }, [filters]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const setStage = useCallback((stage: DiscipleshipStage | undefined) => {
    setFilters((prev) => ({ ...prev, stage, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setGender = useCallback((gender: 'male' | 'female' | undefined) => {
    setFilters((prev) => ({ ...prev, gender, page: 1 }));
  }, []);

  const setBranchId = useCallback((branchId: string | undefined) => {
    setFilters((prev) => ({ ...prev, branchId, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setDateRange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      setFilters((prev) => ({
        ...prev,
        salvationDateFrom: from || undefined,
        salvationDateTo: to || undefined,
        page: 1,
      }));
    },
    []
  );

  const downloadCsv = useCallback(async () => {
    setCsvLoading(true);
    try {
      await adminApi.downloadCsv({
        stage: filters.stage,
        search: filters.search,
        salvationDateFrom: filters.salvationDateFrom,
        salvationDateTo: filters.salvationDateTo,
        gender: filters.gender,
        isHolySpiritFilled: filters.isHolySpiritFilled,
        branchId: filters.branchId,
      });
    } catch {
      // Error silently — could add toast here
    } finally {
      setCsvLoading(false);
    }
  }, [filters]);

  return {
    ...state,
    filters,
    setStage,
    setSearch,
    setGender,
    setBranchId,
    setPage,
    setDateRange,
    refetch: fetchData,
    downloadCsv,
    csvLoading,
  };
}
