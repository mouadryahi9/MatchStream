import { useQuery } from "@tanstack/react-query";
import { koooraApi } from "../services/api/endpoints";

export function useStandings(competitionId) {
  return useQuery({
    queryKey: ["kooora", "standings", competitionId],
    queryFn: () => koooraApi.standings(competitionId),
    staleTime: 120000,
    refetchInterval: 300000,
  });
}

export function useTopScorers(competitionId) {
  return useQuery({
    queryKey: ["kooora", "top-scorers", competitionId],
    queryFn: () => koooraApi.topScorers(competitionId),
    staleTime: 120000,
    refetchInterval: 300000,
  });
}
