"use client";

import { useEffect, useRef, useState } from "react";
import { useClient, useSubscription } from "urql";
import { RELEASE_CHANGED } from "../graphql";
import { isOwnChange, nextNotice, type ChangeNotice } from "./banner";
import { RECONNECT_EVENT } from "./client";
import { getClientId } from "./clientId";
import { revalidateReleaseDetail } from "./release-detail";
import { revalidateReleaseList } from "./release-list";

type ReleaseChange = {
  releaseId: string;
  kind: string;
  stepKey?: string | null;
  completed?: boolean | null;
  sourceClientId: string;
};

type UseRemoteChangesOptions = {
  onRefresh?: () => void;
};

export function useRemoteChanges({ onRefresh }: UseRemoteChangesOptions = {}) {
  const client = useClient();
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [result] = useSubscription<{ releaseChanged: ReleaseChange }>({
    query: RELEASE_CHANGED,
  });
  const onRefreshRef = useRef(onRefresh);
  const seenEvent = useRef("");
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const event = result.data?.releaseChanged;
    if (!event) {
      return;
    }
    const eventKey = JSON.stringify(event);
    if (eventKey === seenEvent.current) {
      return;
    }
    seenEvent.current = eventKey;
    const own = isOwnChange(event.sourceClientId, getClientId());
    if (
      !own &&
      (event.kind === "RELEASE_CREATED" ||
        event.kind === "RELEASE_DELETED" ||
        event.kind === "STEP_CHANGED")
    ) {
      revalidateReleaseList(client);
    }
    if (
      !own &&
      (event.kind === "STEP_CHANGED" ||
        event.kind === "NOTES_CHANGED" ||
        event.kind === "RELEASE_DELETED")
    ) {
      revalidateReleaseDetail(client, event.releaseId);
    }
    if (own) {
      return;
    }
    if (event.kind === "STEP_CHANGED" || event.kind === "NOTES_CHANGED") {
      setNotice((current) => nextNotice(current, event));
    }
  }, [client, result.data]);

  useEffect(() => {
    if (!onRefresh) {
      return;
    }
    const onReconnect = () => onRefresh();
    window.addEventListener(RECONNECT_EVENT, onReconnect);
    return () => window.removeEventListener(RECONNECT_EVENT, onReconnect);
  }, [onRefresh]);

  return {
    notice,
    dismiss: () => setNotice(null),
  };
}
