import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stato condiviso per il pull-to-refresh.
 *
 * Tiene il flag `refreshing` alzato mentre l'azione passata è in corso e non
 * scrive più sullo stato se la schermata è già stata smontata: il refresh del
 * profilo, per esempio, può scoprire un token scaduto e riportare al login
 * mentre la sua azione è ancora in volo.
 *
 * `azione` deve essere stabile (avvolta in useCallback dal chiamante), così
 * l'handler non cambia identità a ogni render.
 */
export function useAggiornamento(azione) {
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await azione();
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [azione]);

  return { refreshing, onRefresh };
}
