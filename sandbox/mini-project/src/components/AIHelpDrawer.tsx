import { exchanges, wallets } from "../data/mockData";
import type { ExchangeId, WalletId } from "../types";

type AIHelpDrawerProps = {
  open: boolean;
  exchangeId: ExchangeId;
  walletId?: WalletId;
  onClose: () => void;
  onToast: (message: string) => void;
};

const faqs = [
  {
    title: "Exchange transfer",
    body: "Choose USDT, paste the destination address, and use TRON / TRC20 only.",
  },
  {
    title: "Wallet setup",
    body: "Your wallet receives USDT. Reinforce does not need your recovery phrase.",
  },
  {
    title: "Missing funds",
    body: "If the exchange says pending, keep this page open. We will continue watching.",
  },
  {
    title: "Wrong network",
    body: "Stop before confirming. The transfer card is only for TRON / TRC20.",
  },
  {
    title: "Missing TRX",
    body: "The first setup step may need a tiny wallet balance unless Reinforce covers it.",
  },
  {
    title: "Scam warning",
    body: "Never share a recovery phrase. Reinforce support will not ask for it.",
  },
];

export function AIHelpDrawer({
  open,
  exchangeId,
  walletId,
  onClose,
  onToast,
}: AIHelpDrawerProps) {
  const exchange = exchanges[exchangeId];
  const wallet = walletId ? wallets[walletId] : undefined;

  return (
    <div
      className={`fixed inset-0 z-40 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <button
        className={`absolute inset-0 bg-slate-950/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        type="button"
      />
      <aside
        className={`absolute bottom-0 right-0 flex max-h-[88vh] w-full flex-col rounded-t-[2rem] bg-white shadow-soft transition-transform duration-300 md:bottom-auto md:top-0 md:h-full md:max-h-full md:w-[420px] md:rounded-l-[2rem] md:rounded-tr-none ${
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        }`}
      >
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Help drawer
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Ask Reinforce</h2>
            </div>
            <button
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Context: {exchange.shortName}
            {wallet ? `, ${wallet.shortName}` : ""}. Mock answers for prototype review.
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {faqs.map((faq) => (
            <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-4" key={faq.title}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                {faq.title}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{faq.body}</p>
            </details>
          ))}
        </div>

        <div className="border-t border-slate-200 p-5">
          <button
            className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={() => onToast("Support request created in demo")}
            type="button"
          >
            Contact support
          </button>
        </div>
      </aside>
    </div>
  );
}
