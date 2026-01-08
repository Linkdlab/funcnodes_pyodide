export type DisconnectObserverStop = () => void;

export const observeDisconnectByPolling = (
  element: { isConnected: boolean },
  onDisconnect: () => void,
  { intervalMs = 250 }: { intervalMs?: number } = {}
): DisconnectObserverStop => {
  let active = true;
  let fired = false;

  const handle = setInterval(() => {
    if (!active || fired) return;
    if (!element.isConnected) {
      fired = true;
      active = false;
      clearInterval(handle);
      onDisconnect();
    }
  }, intervalMs);

  return () => {
    if (!active) return;
    active = false;
    clearInterval(handle);
  };
};
