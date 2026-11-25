import { useEffect, useRef, useState } from "react";
import { explainError } from "../lib/errors";

export function useAsync<T>(loader: () => Promise<T>, key: string) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    void loaderRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false });
      })
      .catch((error) => {
        if (active) setState({ error: explainError(error), loading: false });
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}
