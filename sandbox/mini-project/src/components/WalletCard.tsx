import { feasibilityLabels, feasibilityStyles, wallets } from "../data/mockData";
import type { WalletId } from "../types";

type WalletCardProps = {
  walletId: WalletId;
  selected?: boolean;
  recommended?: boolean;
  onSelect?: (walletId: WalletId) => void;
  actionLabel?: string;
  onAction?: (walletId: WalletId) => void;
};

export function WalletCard({
  walletId,
  selected,
  recommended,
  onSelect,
  actionLabel,
  onAction,
}: WalletCardProps) {
  const wallet = wallets[walletId];
  const isInteractive = Boolean(onSelect || onAction);

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        selected || recommended ? "border-slate-950 ring-4 ring-slate-100" : "border-slate-200"
      } ${isInteractive ? "hover:-translate-y-0.5 hover:shadow-lift" : ""}`}
    >
      <button
        className="w-full text-left"
        disabled={!onSelect}
        onClick={() => onSelect?.(walletId)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              {wallet.shortName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-950">{wallet.name}</h3>
              <p className="text-xs font-medium text-slate-500">{wallet.type}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {recommended ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Recommended
              </span>
            ) : null}
            {wallet.badge && !recommended ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {wallet.badge}
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{wallet.plainCopy}</p>
        {wallet.caution ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
            {wallet.caution}
          </p>
        ) : null}
        <span
          className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${feasibilityStyles[wallet.feasibility]}`}
        >
          {feasibilityLabels[wallet.feasibility]}
        </span>
      </button>
      {actionLabel ? (
        <button
          className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={() => onAction?.(walletId)}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
