"use client";

import { useEffect, useRef, useState } from "react";
import { useSubscription } from "urql";
import { RELEASE_CHANGED } from "../graphql";
import { isOwnChange, nextNotice, type ChangeNotice } from "./banner";
import { RECONNECT_EVENT } from "./client";
import { getClientId } from "./clientId";

type ReleaseChange = {
  releaseId: string;
  kind: string;
  stepKey?: string | null;
  completed?: boolean | null;
  sourceClientId: string;
};

type UseRemoteChangesOptions = {
  onRefresh: () => void;
};

export function useRemoteChanges({ onRefresh }: UseRemoteChangesOptions) {
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
    if (eventKey === seenEvent.current || isOwnChange(event.sourceClientId, getClientId())) {
      seenEvent.current = eventKey;
      return;
    }
    seenEvent.current = eventKey;
    if (event.kind === "STEP_CHANGED" || event.kind === "NOTES_CHANGED") {
      setNotice((current) => nextNotice(current, event));
    }
    onRefreshRef.current();
  }, [result.data]);

  useEffect(() => {
    const onReconnect = () => onRefresh();
    window.addEventListener(RECONNECT_EVENT, onReconnect);
    return () => window.removeEventListener(RECONNECT_EVENT, onReconnect);
  }, [onRefresh]);

  return {
    notice,
    dismiss: () => setNotice(null),
  };
}
