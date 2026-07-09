import type { ReactNode } from "react";
import { blockers, exchanges, scenarios, wallets } from "../data/mockData";
import type { BlockerId, DeviceType, ExchangeId, Scenario, UserRouteState, WalletId, WalletState } from "../types";

type ScenarioPanelProps = {
  state: UserRouteState;
  activeScenarioId?: string;
  onScenario: (scenario: Scenario) => void;
  onPatch: (patch: Partial<UserRouteState>) => void;
};

export function ScenarioPanel({ state, activeScenarioId, onScenario, onPatch }: ScenarioPanelProps) {
  return (
    <aside className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-soft backdrop-blur">
      <details open>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dev / test panel
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">Scenario switcher</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Demo
            </span>
          </div>
        </summary>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-500" htmlFor="scenario-select">
            Preset
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-950"
            id="scenario-select"
            onChange={(event) => {
              const scenario = scenarios.find((item) => item.id === event.target.value);
              if (scenario) onScenario(scenario);
            }}
            value={activeScenarioId ?? ""}
          >
            <option value="">Custom route</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {scenarios.map((scenario) => (
            <button
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                activeScenarioId === scenario.id
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              key={scenario.id}
              onClick={() => onScenario(scenario)}
              type="button"
            >
              {scenario.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Control label="Device">
            <select
              className="control-select"
              onChange={(event) => onPatch({ device: event.target.value as DeviceType })}
              value={state.device}
            >
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </Control>
          <Control label="Exchange">
            <select
              className="control-select"
              onChange={(event) => onPatch({ exchangeId: event.target.value as ExchangeId })}
              value={state.exchangeId}
            >
              {Object.values(exchanges).map((exchange) => (
                <option key={exchange.id} value={exchange.id}>
                  {exchange.name}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Wallet state">
            <select
              className="control-select"
              onChange={(event) => {
                const walletState = event.target.value as WalletState;
                onPatch({
                  walletState,
                  walletId: walletState === "none" ? undefined : state.walletId,
                });
              }}
              value={state.walletState}
            >
              <option value="existing">Existing wallet</option>
              <option value="none">No wallet</option>
              <option value="walletless">Walletless easiest path</option>
            </select>
          </Control>
          <Control label="Wallet type">
            <select
              className="control-select"
              onChange={(event) =>
                onPatch({
                  walletId: event.target.value as WalletId,
                  walletState: event.target.value === "passkey-wallet" ? "walletless" : "existing",
                })
              }
              value={state.walletId ?? ""}
            >
              <option value="">Not selected</option>
              {Object.values(wallets).map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Blocker">
            <select
              className="control-select"
              onChange={(event) => onPatch({ blockerId: event.target.value as BlockerId })}
              value={state.blockerId}
            >
              {Object.entries(blockers).map(([id, blocker]) => (
                <option key={id} value={id}>
                  {blocker.title}
                </option>
              ))}
            </select>
          </Control>
        </div>
      </details>
    </aside>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
