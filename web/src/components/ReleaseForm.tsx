"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CombinedError, useClient, useMutation, useQuery } from "urql";
import {
  CREATE_RELEASE,
  DELETE_RELEASE,
  RELEASE_QUERY,
  SET_STEP,
  UPDATE_NOTES,
} from "../graphql";
import { ChangeBanner } from "./ChangeBanner";
import { CheckIcon, SpinnerIcon, TrashIcon } from "./icons";
import { StepCheckbox } from "./StepCheckbox";
import { getClientId } from "../lib/clientId";
import { confirmDelete } from "../lib/confirm-delete";
import { cacheReleaseDetail, registerReleaseDetail } from "../lib/release-detail";
import { revalidateReleaseList } from "../lib/release-list";
import { STEP_DEFINITIONS } from "../lib/steps";
import { useRemoteChanges } from "../lib/useRemoteChanges";

type StepState = {
  key: string;
  label: string;
  completed: boolean;
};

type ReleaseData = {
  id: string;
  name: string;
  dueDate: string;
  notes: string | null;
  steps: StepState[];
};

type DraftBaseline = {
  notes: string;
  steps: Record<string, boolean>;
};

const emptySteps = (): StepState[] =>
  STEP_DEFINITIONS.map((step) => ({ key: step.key, label: step.label, completed: false }));

function stepValues(steps: StepState[]): Record<string, boolean> {
  return Object.fromEntries(steps.map((step) => [step.key, step.completed]));
}

function isDraftDirty(notes: string, steps: StepState[], baseline: DraftBaseline): boolean {
  if (notes !== baseline.notes) {
    return true;
  }
  return steps.some((step) => baseline.steps[step.key] !== step.completed);
}

function fieldErrorsFrom(error: CombinedError | undefined): Record<string, string> {
  const graphQLError = error?.graphQLErrors[0];
  const field = graphQLError?.extensions?.field;
  if (typeof field !== "string" || !graphQLError) {
    return {};
  }
  return { [field]: graphQLError.message };
}

export function ReleaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const isNew = releaseId === "";

  useEffect(() => {
    setReleaseId(searchParams.get("id") ?? "");
  }, [searchParams]);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState<StepState[]>(emptySteps);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [baseline, setBaseline] = useState<DraftBaseline | null>(null);
  const notesRef = useRef(notes);
  const stepsRef = useRef(steps);
  const baselineRef = useRef<DraftBaseline | null>(null);
  notesRef.current = notes;
  stepsRef.current = steps;

  const rememberBaseline = useCallback((next: DraftBaseline) => {
    baselineRef.current = next;
    setBaseline(next);
  }, []);

  useEffect(() => {
    baselineRef.current = null;
    setBaseline(null);
    setName("");
    setDueDate("");
    setNotes("");
    setSteps(emptySteps());
    setFieldErrors({});
  }, [releaseId]);

  const client = useClient();
  const [releaseResult, reexecuteRelease] = useQuery<{ release: ReleaseData | null }>({
    query: RELEASE_QUERY,
    variables: { id: releaseId ?? "" },
    pause: releaseId === null || isNew,
  });
  const [, createRelease] = useMutation(CREATE_RELEASE);
  const [, setStepCompleted] = useMutation(SET_STEP);
  const [, updateNotes] = useMutation(UPDATE_NOTES);
  const [, deleteRelease] = useMutation(DELETE_RELEASE);

  const refresh = useCallback(() => {
    if (releaseId) {
      reexecuteRelease({ requestPolicy: "network-only" });
    }
  }, [releaseId, reexecuteRelease]);
  useEffect(() => {
    if (!releaseId || isNew) {
      return;
    }
    return registerReleaseDetail(releaseId, refresh);
  }, [isNew, refresh, releaseId]);
  const { notice, dismiss } = useRemoteChanges({ onRefresh: refresh });

  useEffect(() => {
    const release = releaseResult.data?.release;
    if (!release || release.id !== releaseId) {
      return;
    }
    setName(release.name);
    setDueDate(release.dueDate);
    const loaded = baselineRef.current;
    const dirty = loaded !== null && isDraftDirty(notesRef.current, stepsRef.current, loaded);
    if (dirty) {
      return;
    }
    const nextBaseline: DraftBaseline = {
      notes: release.notes ?? "",
      steps: stepValues(release.steps),
    };
    rememberBaseline(nextBaseline);
    setNotes(nextBaseline.notes);
    setSteps(release.steps);
  }, [releaseId, releaseResult.data, rememberBaseline]);

  function onToggle(key: string, completed: boolean) {
    setSteps((current) =>
      current.map((step) => (step.key === key ? { ...step, completed } : step)),
    );
  }

  async function onSave() {
    setFieldErrors({});
    setIsSaving(true);
    const clientId = getClientId();
    if (isNew) {
      const created = await createRelease({
        name,
        dueDate,
        notes,
        clientId,
      });
      if (created.error || !created.data?.createRelease) {
        const errors = fieldErrorsFrom(created.error);
        setFieldErrors(
          Object.keys(errors).length > 0
            ? errors
            : { name: created.error?.message ?? "Could not save the release." },
        );
        setIsSaving(false);
        return;
      }
      const id = (created.data.createRelease as ReleaseData).id;
      const completedSteps = steps.filter((step) => step.completed);
      for (const step of completedSteps) {
        await setStepCompleted({
          releaseId: id,
          stepKey: step.key,
          completed: true,
          clientId,
        });
      }
      if (completedSteps.length > 0) {
        revalidateReleaseList(client);
      }
      setIsSaving(false);
      router.push("/");
      return;
    }
    if (!releaseId) {
      setIsSaving(false);
      return;
    }
    const loaded = baselineRef.current;
    let stepsChanged = false;
    for (const step of steps) {
      if (loaded && step.completed === loaded.steps[step.key]) {
        continue;
      }
      const saved = await setStepCompleted({
        releaseId,
        stepKey: step.key,
        completed: step.completed,
        clientId,
      });
      if (saved.error || !saved.data?.setStepCompleted) {
        cacheReleaseDetail(client, releaseId);
        revalidateReleaseList(client);
        setFieldErrors({ steps: saved.error?.message ?? "Could not save the checklist." });
        setIsSaving(false);
        return;
      }
      stepsChanged = true;
      if (loaded) {
        const current = baselineRef.current ?? loaded;
        rememberBaseline({
          notes: current.notes,
          steps: { ...current.steps, [step.key]: step.completed },
        });
      }
    }
    if (loaded && notes === loaded.notes) {
      cacheReleaseDetail(client, releaseId);
      if (stepsChanged) {
        revalidateReleaseList(client);
      }
      setIsSaving(false);
      router.push("/");
      return;
    }
    const updated = await updateNotes({ id: releaseId, notes, clientId });
    if (updated.error) {
      const errors = fieldErrorsFrom(updated.error);
      setFieldErrors(
        Object.keys(errors).length > 0 ? errors : { notes: updated.error.message },
      );
      if (stepsChanged) {
        revalidateReleaseList(client);
      }
      setIsSaving(false);
      return;
    }
    cacheReleaseDetail(client, releaseId);
    if (stepsChanged) {
      revalidateReleaseList(client);
    }
    setIsSaving(false);
    router.push("/");
  }

  async function onDelete() {
    if (!releaseId || !confirmDelete(name || "this release")) {
      return;
    }
    const deleted = await deleteRelease({ id: releaseId, clientId: getClientId() });
    if (!deleted.error) {
      cacheReleaseDetail(client, releaseId);
    }
    router.push("/");
  }

  const loadedRelease = releaseResult.data?.release;
  const releaseMatches = loadedRelease != null && loadedRelease.id === releaseId;
  const releaseMissing =
    releaseId !== null && !isNew && !releaseResult.fetching && releaseResult.data?.release === null;
  const isLoading =
    releaseId === null ||
    (!isNew && releaseResult.fetching && !releaseResult.data) ||
    (!isNew && releaseMatches && baseline === null);

  return (
    <div className="content">
      {notice ? <ChangeBanner message={notice.message} onClose={dismiss} /> : null}
      <section className="card">
        <div className="card-header">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">All releases</Link>
            <span aria-hidden="true">&gt;</span>
            <span className="breadcrumb-current">{isNew ? "New release" : name || "Release"}</span>
          </nav>
          {!isNew && !releaseMissing ? (
            <button className="button delete" type="button" onClick={onDelete}>
              Delete
              <TrashIcon />
            </button>
          ) : null}
        </div>
        <div className="card-body">
          {isLoading ? <p className="status-line">Loading release...</p> : null}
          {releaseMissing ? (
            <p className="empty-state">
              This release no longer exists. <Link href="/">All releases</Link>
            </p>
          ) : null}
          {!isLoading && !releaseMissing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSave();
              }}
            >
              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="release-name">
                    Release name
                  </label>
                  <input
                    id="release-name"
                    value={name}
                    readOnly={!isNew}
                    disabled={!isNew}
                    placeholder="Version 1.0.1"
                    onChange={(event) => setName(event.target.value)}
                  />
                  {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="release-date">
                    Date
                  </label>
                  <input
                    id="release-date"
                    type="date"
                    value={dueDate}
                    readOnly={!isNew}
                    disabled={!isNew}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                  {fieldErrors.dueDate ? <p className="field-error">{fieldErrors.dueDate}</p> : null}
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="release-notes">
                  Additional remarks / tasks
                </label>
                <textarea
                  id="release-notes"
                  value={notes}
                  placeholder="Please enter any other important notes for the release"
                  onChange={(event) => setNotes(event.target.value)}
                />
                {fieldErrors.notes ? <p className="field-error">{fieldErrors.notes}</p> : null}
              </div>
              <ul className="checklist">
                {steps.map((step) => (
                  <li key={step.key}>
                    <StepCheckbox
                      label={step.label}
                      completed={step.completed}
                      disabled={isSaving}
                      onToggle={(completed) => onToggle(step.key, completed)}
                    />
                  </li>
                ))}
              </ul>
              {fieldErrors.steps ? <p className="field-error">{fieldErrors.steps}</p> : null}
              <div className="form-actions">
                <button
                  className={isSaving ? "button is-saving" : "button"}
                  type="submit"
                  disabled={isSaving}
                  aria-busy={isSaving}
                >
                  Save
                  {isSaving ? <SpinnerIcon /> : <CheckIcon />}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
