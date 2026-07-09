import type { BlockerId } from "../types";
import { blockers } from "../data/mockData";

type BlockerStateCardProps = {
  blockerId: BlockerId;
  onAction: (action: string) => void;
};

export function BlockerStateCard({ blockerId, onAction }: BlockerStateCardProps) {
  const blocker = blockers[blockerId];

  if (blockerId === "none") {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 rounded-full bg-amber-500" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Needs attention
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-950">{blocker.title}</h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">{blocker.body}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {blocker.actions.map((action) => (
          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100"
            key={action}
            onClick={() => onAction(action)}
            type="button"
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}
