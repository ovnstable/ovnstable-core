import type { ReactNode } from "react";

type StepHeaderProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

export function StepHeader({ eyebrow, title, body, onBack, rightSlot }: StepHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {body ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{body}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rightSlot}
        {onBack ? (
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
        ) : null}
      </div>
    </header>
  );
}
