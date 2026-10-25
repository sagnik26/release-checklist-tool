"use client";

import { Provider } from "urql";
import type { ReactNode } from "react";
import { client } from "../lib/client";

export function Providers({ children }: { children: ReactNode }) {
  return <Provider value={client}>{children}</Provider>;
}
