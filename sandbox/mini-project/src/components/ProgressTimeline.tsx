import type { TimelineStep } from "../types";

type ProgressTimelineProps = {
  steps: TimelineStep[];
  activeIndex: number;
};

export function ProgressTimeline({ steps, activeIndex }: ProgressTimelineProps) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live status
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {steps[Math.min(activeIndex, steps.length - 1)]?.label}
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Watching
        </span>
      </div>
      <ol className="mt-6 space-y-4">
        {steps.map((step, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li className="flex gap-3" key={step.id}>
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    className={`mt-2 h-8 w-px ${
                      complete ? "bg-emerald-300" : active ? "animate-pulse-line bg-slate-300" : "bg-slate-200"
                    }`}
                  />
                ) : null}
              </div>
              <div className="pb-2">
                <p className={`text-sm font-semibold ${active ? "text-slate-950" : "text-slate-700"}`}>
                  {step.label}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
