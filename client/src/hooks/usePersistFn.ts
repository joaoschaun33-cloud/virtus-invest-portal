import { useRef } from "react";

export function usePersistFn<Args extends unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  const fnRef = useRef<(...args: Args) => Return>(fn);
  fnRef.current = fn;

  const persistFn = useRef<((...args: Args) => Return) | null>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args: Args): Return {
      return fnRef.current!.apply(this, args);
    };
  }

  return persistFn.current!;
}
