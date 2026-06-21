import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchesApi } from "../services/api/endpoints";

export function useMatches(params) {
  return useQuery({
    queryKey: ["matches", params],
    queryFn: () => matchesApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useMatch(id) {
  return useQuery({
    queryKey: ["match", id],
    queryFn: () => matchesApi.getById(id),
    enabled: !!id,
  });
}

export function useLiveMatches() {
  return useQuery({
    queryKey: ["matches", "live"],
    queryFn: matchesApi.live,
    refetchInterval: 30000,
  });
}

export function useUpcomingMatches(limit = 10) {
  return useQuery({
    queryKey: ["matches", "upcoming", limit],
    queryFn: () => matchesApi.upcoming(limit),
  });
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => matchesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: matchesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
