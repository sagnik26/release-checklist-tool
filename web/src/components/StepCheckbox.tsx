"use client";

type StepCheckboxProps = {
  label: string;
  completed: boolean;
  disabled?: boolean;
  onToggle: (completed: boolean) => void;
};

export function StepCheckbox({ label, completed, disabled, onToggle }: StepCheckboxProps) {
  return (
    <label className="step-row">
      <input
        type="checkbox"
        checked={completed}
        disabled={disabled}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
