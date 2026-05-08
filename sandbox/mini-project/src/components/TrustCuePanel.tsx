type TrustCuePanelProps = {
  onOpenProof: () => void;
};

const cues = [
  "Your wallet stays in your control",
  "Use TRON only for this transfer",
  "Withdraw back to USDT anytime",
  "We will watch for your transfer",
];

export function TrustCuePanel({ onOpenProof }: TrustCuePanelProps) {
  return (
    <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Safety cues
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Clear before you send</h2>
        </div>
        <button
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={onOpenProof}
          type="button"
        >
          Proof
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {cues.map((cue) => (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={cue}>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-slate-800">{cue}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
