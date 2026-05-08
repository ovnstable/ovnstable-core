import type { ReactNode } from "react";
import type { Exchange, TransferIntent } from "../types";

type TransferCardProps = {
  intent: TransferIntent;
  exchange: Exchange;
  onToast: (message: string) => void;
  onOpenExchange: () => void;
  onSent: () => void;
  compact?: boolean;
};

function qrCells(seed: string) {
  const cells: boolean[] = [];
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }

  for (let index = 0; index < 121; index += 1) {
    const finder =
      (index < 33 && index % 11 < 3) ||
      (index > 87 && index % 11 < 3) ||
      (index < 33 && index % 11 > 7);
    cells.push(finder || ((hash + index * 17 + (index % 5) * 23) % 7 < 3));
  }

  return cells;
}

export function TransferCard({
  intent,
  exchange,
  onToast,
  onOpenExchange,
  onSent,
  compact,
}: TransferCardProps) {
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      onToast(`${label} copied`);
    } catch {
      onToast(`${label} ready to copy`);
    }
  };

  const share = async () => {
    const text = `Send ${intent.asset} on ${intent.network} to ${intent.destinationAddress}`;

    if ("share" in navigator) {
      try {
        await navigator.share({ title: "Reinforce transfer card", text });
        onToast("Transfer card shared");
        return;
      } catch {
        onToast("Share canceled");
        return;
      }
    }

    onToast("Share sheet is not available in this browser");
  };

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Transfer card
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Move USDT from {exchange.shortName}
          </h2>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
          Demo
        </span>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? "" : "md:grid-cols-[0.95fr_1.05fr]"}`}>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoTile label="Asset" value={intent.asset} />
            <InfoTile label="Network" value={intent.network} emphasize />
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">Destination address</p>
            <p className="mt-2 break-all font-mono text-sm leading-6 text-slate-950">
              {intent.destinationAddress}
            </p>
          </div>
          {intent.amount ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Optional amount</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{intent.amount} USDT</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid h-48 w-48 grid-cols-11 gap-1 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
            {qrCells(intent.qrSeed).map((active, index) => (
              <span
                className={`rounded-[0.2rem] ${active ? "bg-slate-950" : "bg-slate-100"}`}
                key={`${intent.qrSeed}-${index}`}
              />
            ))}
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            Mock QR for prototype testing
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          onClick={() => copy("Address", intent.destinationAddress)}
          type="button"
        >
          Copy address
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          onClick={() => copy("Amount", intent.amount ?? "")}
          type="button"
        >
          Copy amount
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          onClick={() => onToast("Transfer card image saved in this demo")}
          type="button"
        >
          Save image
        </button>
        <button
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          onClick={share}
          type="button"
        >
          Share
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <WarningTone>Use TRON only.</WarningTone>
        <WarningTone>Wrong network can cause loss.</WarningTone>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          We will watch for your transfer.
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          onClick={onOpenExchange}
          type="button"
        >
          {exchange.openLabel}
        </button>
        <button
          className="rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          onClick={onSent}
          type="button"
        >
          I have sent it
        </button>
      </div>
    </section>
  );
}

function InfoTile({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${emphasize ? "text-emerald-700" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}

function WarningTone({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      {children}
    </div>
  );
}
