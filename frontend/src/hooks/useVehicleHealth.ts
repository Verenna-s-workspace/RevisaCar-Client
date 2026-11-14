import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../services/api';

/** Saúde real do veículo (calculada no backend a partir dos lembretes). */
export function useVehicleHealth(vehicleId?: string) {
  return useQuery({
    queryKey: ['health', vehicleId],
    queryFn: () => healthApi.get(vehicleId!).then(r => r.data),
    enabled: !!vehicleId,
    staleTime: 60_000,
  });
}
