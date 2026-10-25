import type { Client } from "urql";
import { RELEASE_QUERY } from "../graphql";

type DetailRefresh = {
  id: string;
  refresh: () => void;
};

let detailRefresh: DetailRefresh | undefined;

export function registerReleaseDetail(id: string, refresh: () => void): () => void {
  const entry = { id, refresh };
  detailRefresh = entry;
  return () => {
    if (detailRefresh === entry) {
      detailRefresh = undefined;
    }
  };
}

export function revalidateReleaseDetail(client: Client, id: string): void {
  if (detailRefresh?.id === id) {
    detailRefresh.refresh();
    return;
  }
  cacheReleaseDetail(client, id);
}

export function cacheReleaseDetail(client: Client, id: string): void {
  void client
    .query(RELEASE_QUERY, { id }, { requestPolicy: "network-only" })
    .toPromise();
}
