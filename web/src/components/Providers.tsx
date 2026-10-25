"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { Provider, useQuery } from "urql";
import { RELEASES_QUERY } from "../graphql";
import { client } from "../lib/client";
import { registerReleaseList } from "../lib/release-list";

export type ReleaseListItem = {
  id: string;
  name: string;
  dueDate: string;
  status: string;
};

type ReleaseListState = {
  releases: ReleaseListItem[];
  isLoading: boolean;
  hasError: boolean;
};

const ReleaseListContext = createContext<ReleaseListState>({
  releases: [],
  isLoading: true,
  hasError: false,
});

export function useReleaseList(): ReleaseListState {
  return useContext(ReleaseListContext);
}

function CachedReleaseList({ children }: { children: ReactNode }) {
  const [result, reexecute] = useQuery<{ releases: ReleaseListItem[] }>({
    query: RELEASES_QUERY,
  });
  const refresh = useCallback(() => {
    reexecute({ requestPolicy: "network-only" });
  }, [reexecute]);
  useEffect(() => registerReleaseList(refresh), [refresh]);

  const releases = result.data?.releases ?? [];
  return (
    <ReleaseListContext.Provider
      value={{
        releases,
        isLoading: result.fetching && !result.data,
        hasError: Boolean(result.error) && !result.data,
      }}
    >
      {children}
    </ReleaseListContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider value={client}>
      <CachedReleaseList>{children}</CachedReleaseList>
    </Provider>
  );
}
