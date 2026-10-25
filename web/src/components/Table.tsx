"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "urql";
import { DELETE_RELEASE } from "../graphql";
import { ChangeBanner } from "./ChangeBanner";
import { EyeIcon, PlusIcon, TrashIcon } from "./icons";
import { formatDueDate, statusLabel } from "../lib/format";
import { getClientId } from "../lib/clientId";
import { confirmDelete } from "../lib/confirm-delete";
import { hideRelease, isReleaseHidden } from "../lib/release-list";
import { useRemoteChanges } from "../lib/useRemoteChanges";
import { useReleaseList } from "./Providers";

export function Table() {
  const { releases: cachedReleases, isLoading, hasError } = useReleaseList();
  const [, deleteRelease] = useMutation(DELETE_RELEASE);
  const [, redraw] = useState(0);
  const { notice, dismiss } = useRemoteChanges();

  async function onDelete(id: string, name: string) {
    if (!confirmDelete(name)) {
      return;
    }
    const outcome = await deleteRelease({ id, clientId: getClientId() });
    if (outcome.error || outcome.data?.deleteRelease !== true) {
      return;
    }
    hideRelease(id);
    redraw((tick) => tick + 1);
  }

  const releases = cachedReleases.filter((release) => !isReleaseHidden(release.id));

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
                          onClick={() => onDelete(release.id, release.name)}
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
