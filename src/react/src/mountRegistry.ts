export type DisposableHandle = {
  dispose: () => void;
};

export type MountRegistry<K = any, H extends DisposableHandle = DisposableHandle> = {
  register: (key: K, handle: H) => () => void;
  get: (key: K) => H | undefined;
  delete: (key: K) => void;
};

export const createMountRegistry = <
  K = any,
  H extends DisposableHandle = DisposableHandle
>(): MountRegistry<K, H> => {
  const map = new Map<K, H>();

  return {
    register: (key, handle) => {
      const prev = map.get(key);
      if (prev && prev !== handle) prev.dispose();
      map.set(key, handle);

      return () => {
        if (map.get(key) === handle) map.delete(key);
      };
    },
    get: (key) => map.get(key),
    delete: (key) => {
      const prev = map.get(key);
      if (!prev) return;
      prev.dispose();
      map.delete(key);
    },
  };
};
