import type { Client } from "urql";
import { RELEASES_QUERY } from "../graphql";

const hiddenReleaseIds = new Set<string>();
let reexecuteList: (() => void) | undefined;

export function hideRelease(id: string): void {
  hiddenReleaseIds.add(id);
}

export function isReleaseHidden(id: string): boolean {
  return hiddenReleaseIds.has(id);
}

export function registerReleaseList(reexecute: () => void): () => void {
  reexecuteList = reexecute;
  return () => {
    if (reexecuteList === reexecute) {
      reexecuteList = undefined;
    }
  };
}

export function revalidateReleaseList(client: Client): void {
  if (reexecuteList) {
    reexecuteList();
    return;
  }
  void client.query(RELEASES_QUERY, {}, { requestPolicy: "network-only" }).toPromise();
}
