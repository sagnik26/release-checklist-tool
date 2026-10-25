"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useMutation, useQuery } from "urql";
import { DELETE_RELEASE, RELEASES_QUERY } from "../graphql";
import { ChangeBanner } from "./ChangeBanner";
import { EyeIcon, PlusIcon, TrashIcon } from "./icons";
import { formatDueDate, statusLabel } from "../lib/format";
import { getClientId } from "../lib/clientId";
import { useRemoteChanges } from "../lib/useRemoteChanges";

type ReleaseListItem = {
  id: string;
  name: string;
  dueDate: string;
  status: string;
};

export function Table() {
  const [result, reexecute] = useQuery<{ releases: ReleaseListItem[] }>({
    query: RELEASES_QUERY,
    requestPolicy: "network-only",
  });
  const [, deleteRelease] = useMutation(DELETE_RELEASE);
  const refresh = useCallback(() => {
    reexecute({ requestPolicy: "network-only" });
  }, [reexecute]);
  const { notice, dismiss } = useRemoteChanges({ onRefresh: refresh });

  async function onDelete(id: string) {
    await deleteRelease({ id, clientId: getClientId() });
    refresh();
  }

  const releases = result.data?.releases ?? [];
  const isLoading = result.fetching && !result.data;
  const hasError = Boolean(result.error) && !result.data;

  return (
    <div className="content">
      {notice ? <ChangeBanner message={notice.message} onClose={dismiss} /> : null}
      <section className="card">
        <div className="card-header">
          <span className="breadcrumb-current">All releases</span>
          <Link className="button" href="/release">
            New release
            <PlusIcon />
          </Link>
        </div>
        <div className="card-body">
          {isLoading ? <p className="status-line">Loading releases...</p> : null}
          {hasError ? (
            <p className="field-error">The release list could not be loaded.</p>
          ) : null}
          {!isLoading && !hasError && releases.length === 0 ? (
            <p className="empty-state">No releases yet. Click New release to add one.</p>
          ) : null}
          {releases.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Release</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {releases.map((release) => (
                    <tr key={release.id}>
                      <td>{release.name}</td>
                      <td>{formatDueDate(release.dueDate)}</td>
                      <td>{statusLabel(release.status)}</td>
                      <td>
                        <Link className="action-link" href={`/release?id=${release.id}`}>
                          View
                          <EyeIcon />
                        </Link>
                      </td>
                      <td>
                        <button
                          className="action-button"
                          type="button"
                          onClick={() => onDelete(release.id)}
                        >
                          Delete
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
