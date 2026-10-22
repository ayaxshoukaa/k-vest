import type { ReactNode } from 'react';

/** Isolate currency, dates, symbols, and other mixed-script inline values. */
export function BidiValue({ children }: { children: ReactNode }) {
  return <bdi className="jx-bidi-value" dir="auto">{children}</bdi>;
}
