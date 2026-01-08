export type SharedWorkerPortRegistry = {
  add: (port: any) => void;
  disconnect: (port: any) => void;
  forEach: (fn: (port: any) => void) => void;
  size: () => number;
};

export const createSharedWorkerPortRegistry = (
  onLastPortDisconnected: () => void
): SharedWorkerPortRegistry => {
  const ports = new Set<any>();

  return {
    add: (port) => {
      ports.add(port);
    },
    disconnect: (port) => {
      if (!ports.delete(port)) return;
      if (ports.size === 0) onLastPortDisconnected();
    },
    forEach: (fn) => {
      ports.forEach(fn);
    },
    size: () => ports.size,
  };
};
