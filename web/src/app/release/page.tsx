import { Suspense } from "react";
import { ReleaseForm } from "../../components/ReleaseForm";

export default function ReleasePage() {
  return (
    <Suspense fallback={<p className="status-line">Loading release...</p>}>
      <ReleaseForm />
    </Suspense>
  );
}
