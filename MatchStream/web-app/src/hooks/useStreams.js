import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { streamsApi } from "../services/api/endpoints";

export function useStream(id) {
  return useQuery({
    queryKey: ["stream", id],
    queryFn: () => streamsApi.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "running" || data?.status === "starting") return 5000;
      return false;
    },
  });
}

export function useStreamStatus(id) {
  return useQuery({
    queryKey: ["stream-status", id],
    queryFn: () => streamsApi.getStatus(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useActiveStreams() {
  return useQuery({
    queryKey: ["streams", "active"],
    queryFn: streamsApi.active,
    refetchInterval: 10000,
  });
}

export function useCreateStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: streamsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streams"] });
    },
  });
}

export function useStopStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: streamsApi.stop,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streams"] });
      qc.invalidateQueries({ queryKey: ["stream"] });
    },
  });
}

export function useRestartStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: streamsApi.restart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streams"] });
      qc.invalidateQueries({ queryKey: ["stream"] });
    },
  });
}
