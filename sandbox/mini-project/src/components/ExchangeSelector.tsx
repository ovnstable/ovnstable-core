import { exchanges } from "../data/mockData";
import type { ExchangeId } from "../types";

type ExchangeSelectorProps = {
  selectedId: ExchangeId;
  onSelect: (exchangeId: ExchangeId) => void;
};

export function ExchangeSelector({ selectedId, onSelect }: ExchangeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Object.values(exchanges).map((exchange) => {
        const selected = exchange.id === selectedId;

        return (
          <button
            key={exchange.id}
            className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift ${
              selected
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
            }`}
            onClick={() => onSelect(exchange.id)}
            type="button"
          >
            <span className={`mb-4 block h-8 w-8 rounded-full ${exchange.color}`} />
            <span className="block text-base font-semibold">{exchange.name}</span>
            <span className={`mt-1 block text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
              Move USDT from {exchange.shortName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
