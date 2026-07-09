import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AIHelpDrawer } from "./components/AIHelpDrawer";
import { BlockerStateCard } from "./components/BlockerStateCard";
import { ExchangeSelector } from "./components/ExchangeSelector";
import { FeasibilityLegend } from "./components/FeasibilityLegend";
import { ProgressTimeline } from "./components/ProgressTimeline";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { StepHeader } from "./components/StepHeader";
import { TransferCard } from "./components/TransferCard";
import { TrustCuePanel } from "./components/TrustCuePanel";
import { WalletCard } from "./components/WalletCard";
import {
  blockers,
  exchanges,
  feasibilityLabels,
  feasibilityStyles,
  historyRecords,
  portfolio,
  scenarios,
  timelineSteps,
  transferIntent,
  wallets,
} from "./data/mockData";
import { getRouteRecommendation, shouldShowUnsupportedWarning } from "./lib/routing";
import type {
  BlockerId,
  ExchangeId,
  ScreenId,
  Scenario,
  UserRouteState,
  WalletId,
  WalletState,
} from "./types";

const defaultScenario = scenarios[0];

export default function App() {
  const [routeState, setRouteState] = useState<UserRouteState>(defaultScenario.state);
  const [activeScenarioId, setActiveScenarioId] = useState(defaultScenario.id);
  const [screen, setScreen] = useState<ScreenId>("landing");
  const [helpOpen, setHelpOpen] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [futureStep, setFutureStep] = useState(0);
  const [withdrawReady, setWithdrawReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  const recommendation = useMemo(() => getRouteRecommendation(routeState), [routeState]);
  const exchange = exchanges[routeState.exchangeId];
  const selectedWalletId = routeState.walletId ?? recommendation.primaryWalletId;

  useEffect(() => {
    if (screen !== "waiting" || routeState.blockerId === "transfer-pending") return;
    if (timelineIndex >= 4) {
      const doneTimer = window.setTimeout(() => setScreen("funds-detected"), 900);
      return () => window.clearTimeout(doneTimer);
    }

    const timer = window.setTimeout(() => {
      setTimelineIndex((current) => Math.min(current + 1, 4));
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [routeState.blockerId, screen, timelineIndex]);

  const toast = (message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2600);
  };

  const patchRoute = (patch: Partial<UserRouteState>) => {
    setRouteState((current) => ({ ...current, ...patch }));
    setActiveScenarioId("");
  };

  const loadScenario = (scenario: Scenario) => {
    setRouteState(scenario.state);
    setActiveScenarioId(scenario.id);
    setScreen(scenario.startScreen ?? "route");
    setTimelineIndex(scenario.startScreen === "portfolio" || scenario.startScreen === "withdraw" ? 7 : 0);
    setFutureStep(0);
    setWithdrawReady(false);
    toast(`${scenario.name} loaded`);
  };

  const go = (nextScreen: ScreenId) => {
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenExchange = () => {
    if (routeState.blockerId === "kyc-incomplete" || routeState.blockerId === "whitelist-cooldown") {
      go("blocker");
      return;
    }

    if (routeState.device === "mobile" || routeState.sameDeviceMode) {
      go("same-device");
      return;
    }

    go("exchange-instructions");
  };

  const handleSent = () => {
    if (routeState.blockerId === "wrong-network") {
      go("blocker");
      return;
    }

    setTimelineIndex(2);
    go("waiting");
  };

  const clearBlocker = () => {
    patchRoute({ blockerId: "none" });
    toast("Blocker cleared for demo");
  };

  const handleBlockerAction = (action: string) => {
    if (action.toLowerCase().includes("help") || action.toLowerCase().includes("open help")) {
      setHelpOpen(true);
      return;
    }

    if (action.includes("recommended wallet") || action.includes("lower-friction wallet")) {
      patchRoute({ blockerId: "none", walletState: "none", walletId: undefined });
      go("wallet-recommendation");
      return;
    }

    if (action.includes("Try again") || action.includes("changed it to TRON") || action === "Continue") {
      clearBlocker();
      go("transfer");
      return;
    }

    if (action.includes("Open exchange") || action.includes("Check exchange")) {
      toast(`${exchange.openLabel} simulated`);
      return;
    }

    if (action.includes("Top up TRX")) {
      toast("TRX top-up action simulated");
      return;
    }

    toast(`${action} simulated`);
  };

  const beginRecommendedRoute = () => {
    if (recommendation.primaryWalletId === "passkey-wallet") {
      go("future-wallet");
      return;
    }

    patchRoute({
      walletId: recommendation.primaryWalletId,
      walletState: routeState.walletState === "existing" ? "existing" : "none",
    });
    go(routeState.walletState === "existing" ? "connect-wallet" : "wallet-recommendation");
  };

  const renderScreen = () => {
    switch (screen) {
      case "landing":
        return (
          <LandingScreen
            onAddMore={() => go("portfolio")}
            onFuture={() => go("future-wallet")}
            onStart={() => go("exchange")}
          />
        );
      case "exchange":
        return (
          <ScreenFrame>
            <StepHeader
              eyebrow="Step 1"
              title="Where is your USDT today?"
              body="Choose your exchange. Reinforce will adapt the wallet recommendation and transfer instructions."
              onBack={() => go("landing")}
            />
            <ExchangeSelector
              selectedId={routeState.exchangeId}
              onSelect={(exchangeId) => patchRoute({ exchangeId })}
            />
            <PrimaryActions
              primary="Continue"
              onPrimary={() => go("wallet-state")}
              secondary="Use quick recommendation"
              onSecondary={() => go("route")}
            />
          </ScreenFrame>
        );
      case "wallet-state":
        return (
          <WalletStateScreen
            selected={routeState.walletState}
            onBack={() => go("exchange")}
            onSelect={(walletState) => patchRoute({ walletState, walletId: walletState === "walletless" ? "passkey-wallet" : routeState.walletId })}
            onNext={() => go("route")}
          />
        );
      case "route":
        return (
          <RouteScreen
            recommendation={recommendation}
            selectedWalletId={selectedWalletId}
            routeState={routeState}
            onBack={() => go("wallet-state")}
            onBegin={beginRecommendedRoute}
            onFuture={() => go("future-wallet")}
            onWallets={() => go("wallet-recommendation")}
            onBlocker={(blockerId) => {
              patchRoute({ blockerId });
              go("blocker");
            }}
          />
        );
      case "wallet-recommendation":
        return (
          <WalletRecommendationScreen
            recommendation={recommendation}
            selectedWalletId={selectedWalletId}
            onBack={() => go("route")}
            onSelect={(walletId) => patchRoute({ walletId, walletState: walletId === "passkey-wallet" ? "walletless" : "existing" })}
            onInstall={(walletId) => {
              patchRoute({ walletId, walletState: walletId === "passkey-wallet" ? "walletless" : "existing" });
              go(walletId === "passkey-wallet" ? "future-wallet" : "install-wallet");
            }}
            onConnect={(walletId) => {
              patchRoute({ walletId, walletState: "existing" });
              go("connect-wallet");
            }}
          />
        );
      case "install-wallet":
        return (
          <InstallWalletScreen
            walletId={selectedWalletId}
            onBack={() => go("wallet-recommendation")}
            onDone={() => {
              patchRoute({ walletState: "existing", walletId: selectedWalletId });
              go("connect-wallet");
            }}
            onFuture={() => go("future-wallet")}
          />
        );
      case "connect-wallet":
        return (
          <ConnectWalletScreen
            blockerId={routeState.blockerId}
            walletId={selectedWalletId}
            onBack={() => go(routeState.walletState === "none" ? "install-wallet" : "route")}
            onBlockerAction={handleBlockerAction}
            onConnect={() => {
              if (routeState.blockerId === "wallet-not-detected") {
                go("blocker");
                return;
              }

              setTimelineIndex(0);
              go(routeState.sameDeviceMode ? "same-device" : "transfer");
            }}
            onHelp={() => setHelpOpen(true)}
          />
        );
      case "transfer":
        return (
          <TransferScreen
            exchangeId={routeState.exchangeId}
            device={routeState.device}
            blockerId={routeState.blockerId}
            timelineIndex={timelineIndex}
            onBack={() => go("connect-wallet")}
            onBlockerAction={handleBlockerAction}
            onHelp={() => setHelpOpen(true)}
            onOpenExchange={handleOpenExchange}
            onProof={() => go("proof")}
            onSent={handleSent}
            onSameDevice={() => go("same-device")}
            onToast={toast}
          />
        );
      case "same-device":
        return (
          <SameDeviceScreen
            exchangeId={routeState.exchangeId}
            onBack={() => go("transfer")}
            onOpen={() => toast(`${exchange.openLabel} simulated`)}
            onRestore={() => {
              toast("Transfer intent restored");
              go("transfer");
            }}
            onSent={handleSent}
            onToast={toast}
          />
        );
      case "exchange-instructions":
        return (
          <ExchangeInstructionsScreen
            exchangeId={routeState.exchangeId}
            blockerId={routeState.blockerId}
            onAction={handleBlockerAction}
            onBack={() => go("transfer")}
            onSent={handleSent}
          />
        );
      case "waiting":
        return (
          <WaitingScreen
            blockerId={routeState.blockerId}
            timelineIndex={timelineIndex}
            onAction={handleBlockerAction}
            onBack={() => go("transfer")}
            onDetected={() => go("funds-detected")}
            onHelp={() => setHelpOpen(true)}
            onNudge={() => setTimelineIndex((current) => Math.min(current + 1, 4))}
          />
        );
      case "funds-detected":
        return (
          <FundsDetectedScreen
            onBack={() => go("waiting")}
            onStart={() => {
              setTimelineIndex(5);
              go("activation");
            }}
          />
        );
      case "activation":
        return routeState.blockerId === "missing-trx" ? (
          <MissingTrxScreen onAction={handleBlockerAction} onBack={() => go("funds-detected")} />
        ) : (
          <ActivationScreen
            onBack={() => go("funds-detected")}
            onStart={() => {
              setTimelineIndex(7);
              go("portfolio");
              toast("Earning live");
            }}
          />
        );
      case "missing-trx":
        return <MissingTrxScreen onAction={handleBlockerAction} onBack={() => go("activation")} />;
      case "portfolio":
        return (
          <PortfolioScreen
            onAdd={() => go("add-more")}
            onProof={() => go("proof")}
            onWithdraw={() => go("withdraw")}
          />
        );
      case "add-more":
        return (
          <AddMoreScreen
            exchangeId={routeState.exchangeId}
            onBack={() => go("portfolio")}
            onOpenExchange={handleOpenExchange}
            onSent={handleSent}
            onToast={toast}
          />
        );
      case "withdraw":
        return (
          <WithdrawScreen
            ready={withdrawReady}
            onBack={() => go("portfolio")}
            onConfirm={() => {
              setWithdrawReady(true);
              toast("Withdrawal preview ready");
            }}
            onDone={() => {
              toast("Mock withdrawal submitted");
              go("portfolio");
            }}
          />
        );
      case "proof":
        return <ProofScreen onBack={() => go("portfolio")} onHelp={() => setHelpOpen(true)} />;
      case "future-wallet":
        return (
          <FutureWalletScreen
            step={futureStep}
            onBack={() => go("route")}
            onNext={() => {
              if (futureStep < 2) {
                setFutureStep((current) => current + 1);
                return;
              }

              patchRoute({ walletState: "walletless", walletId: "passkey-wallet", blockerId: "none" });
              go("transfer");
            }}
            onUseClassic={() => go("wallet-recommendation")}
          />
        );
      case "blocker":
        return (
          <ScreenFrame>
            <StepHeader
              eyebrow="Recovery"
              title="Resolve this before continuing"
              body="This branch shows how Reinforce can keep users oriented when an exchange, wallet, or transfer blocks the happy path."
              onBack={() => go("transfer")}
            />
            <BlockerStateCard blockerId={routeState.blockerId} onAction={handleBlockerAction} />
            <button
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white"
              onClick={clearBlocker}
              type="button"
            >
              Clear blocker for demo
            </button>
          </ScreenFrame>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button className="flex items-center gap-3" onClick={() => go("landing")} type="button">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              R
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-950">Reinforce.fi</span>
              <span className="block text-xs font-semibold text-slate-500">xUSD on TRON</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
              Demo
            </span>
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setHelpOpen(true)}
              type="button"
            >
              Help
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-24 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 animate-rise" key={screen}>
          {renderScreen()}
        </section>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ScenarioPanel
            activeScenarioId={activeScenarioId}
            onPatch={patchRoute}
            onScenario={loadScenario}
            state={routeState}
          />
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Feasibility
            </p>
            <FeasibilityLegend />
          </div>
        </div>
      </main>

      <AIHelpDrawer
        exchangeId={routeState.exchangeId}
        onClose={() => setHelpOpen(false)}
        onToast={toast}
        open={helpOpen}
        walletId={selectedWalletId}
      />

      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:w-96">
        {toasts.map((item) => (
          <div
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lift"
            key={item.id}
          >
            {item.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenFrame({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function LandingScreen({
  onAddMore,
  onFuture,
  onStart,
}: {
  onAddMore: () => void;
  onFuture: () => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              UI-only onboarding demo
            </span>
            <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Move your USDT into a wallet where it earns.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Reinforce guides a plain-language path from exchange transfer to xUSD earning on TRON.
              Your wallet stays in your control, and every step is reversible.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button className="primary-button" onClick={onStart} type="button">
                Start onboarding
              </button>
              <button className="secondary-button" onClick={onAddMore} type="button">
                View returning user
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  xUSD preview
                </p>
                <p className="mt-2 text-3xl font-semibold">1,248.63</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                Earning active
              </span>
            </div>
            <div className="mt-8 space-y-3">
              {["Move USDT from your exchange", "Use TRON only", "Start earning", "Withdraw back to USDT"].map(
                (item, index) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3"
                    key={item}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{item}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <LandingCard title="Safety first" body="Warnings stay close to the send action, not hidden in advanced screens." />
        <LandingCard title="Progress visible" body="A live timeline shows when the wallet is ready, funds arrive, and earning begins." />
        <button
          className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-5 text-left shadow-sm transition hover:border-slate-950 hover:shadow-lift"
          onClick={onFuture}
          type="button"
        >
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
            Future route
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">Create an earning wallet with passkey</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Simulates a future walletless path for the easiest possible onboarding.
          </p>
        </button>
      </div>
    </div>
  );
}

function LandingCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function WalletStateScreen({
  selected,
  onBack,
  onNext,
  onSelect,
}: {
  selected: WalletState;
  onBack: () => void;
  onNext: () => void;
  onSelect: (walletState: WalletState) => void;
}) {
  const choices: { id: WalletState; title: string; body: string; badge?: string }[] = [
    {
      id: "existing",
      title: "I already have a wallet",
      body: "Connect it, then move USDT from your exchange.",
    },
    {
      id: "none",
      title: "I do not have a wallet",
      body: "We will recommend a wallet based on your exchange.",
    },
    {
      id: "walletless",
      title: "Easiest path",
      body: "Simulate creating an earning wallet with a passkey.",
      badge: "Future route",
    },
  ];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Step 2"
        title="How do you want to receive USDT?"
        body="The prototype can route through an existing wallet, a recommended wallet, or a future embedded-wallet path."
        onBack={onBack}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {choices.map((choice) => (
          <button
            className={`rounded-[1.75rem] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift ${
              selected === choice.id ? "border-slate-950 ring-4 ring-slate-100" : "border-slate-200"
            }`}
            key={choice.id}
            onClick={() => onSelect(choice.id)}
            type="button"
          >
            {choice.badge ? (
              <span className="mb-4 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {choice.badge}
              </span>
            ) : null}
            <h2 className="text-lg font-semibold text-slate-950">{choice.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{choice.body}</p>
          </button>
        ))}
      </div>
      <PrimaryActions primary="Show recommendation" onPrimary={onNext} secondary="Back" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function RouteScreen({
  recommendation,
  selectedWalletId,
  routeState,
  onBack,
  onBegin,
  onBlocker,
  onFuture,
  onWallets,
}: {
  recommendation: ReturnType<typeof getRouteRecommendation>;
  selectedWalletId: WalletId;
  routeState: UserRouteState;
  onBack: () => void;
  onBegin: () => void;
  onBlocker: (blockerId: BlockerId) => void;
  onFuture: () => void;
  onWallets: () => void;
}) {
  const wallet = wallets[selectedWalletId];
  const exchange = exchanges[routeState.exchangeId];
  const warning = shouldShowUnsupportedWarning(routeState.walletId)
    ? "Needs verification for TRON before this can be the default route."
    : undefined;

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Recommendation"
        title={recommendation.title}
        body={recommendation.summary}
        onBack={onBack}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${feasibilityStyles[recommendation.feasibility]}`}
            >
              {feasibilityLabels[recommendation.feasibility]}
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">
              {wallet.shortName} for {exchange.shortName}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Move USDT from your exchange, use TRON only, and keep the receiving wallet in your control.
            </p>
          </div>
          <WalletCard walletId={selectedWalletId} recommended />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {recommendation.steps.map((step, index) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={step}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950 ring-1 ring-slate-200">
                {index + 1}
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">{step}</p>
            </div>
          ))}
        </div>

        {[...recommendation.warnings, warning].filter(Boolean).map((item) => (
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" key={item}>
            {item}
          </div>
        ))}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button className="primary-button" onClick={onBegin} type="button">
            Use this route
          </button>
          <button className="secondary-button" onClick={onWallets} type="button">
            Choose wallet
          </button>
          <button
            className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-slate-950"
            onClick={onFuture}
            type="button"
          >
            Future passkey route
          </button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <MiniBlockerButton label="Wrong network warning" onClick={() => onBlocker("wrong-network")} />
        <MiniBlockerButton label="KYC required" onClick={() => onBlocker("kyc-incomplete")} />
        <MiniBlockerButton label="Wallet not detected" onClick={() => onBlocker("wallet-not-detected")} />
      </div>
    </ScreenFrame>
  );
}

function WalletRecommendationScreen({
  recommendation,
  selectedWalletId,
  onBack,
  onConnect,
  onInstall,
  onSelect,
}: {
  recommendation: ReturnType<typeof getRouteRecommendation>;
  selectedWalletId: WalletId;
  onBack: () => void;
  onConnect: (walletId: WalletId) => void;
  onInstall: (walletId: WalletId) => void;
  onSelect: (walletId: WalletId) => void;
}) {
  const walletIds: WalletId[] = Array.from(
    new Set<WalletId>([
      recommendation.primaryWalletId,
      ...recommendation.alternateWalletIds,
      "passkey-wallet",
    ]),
  );

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Wallet"
        title="Choose the wallet route"
        body="Each card is clickable. The recommendation changes with exchange, device, and wallet state."
        onBack={onBack}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {walletIds.map((walletId) => (
          <WalletCard
            actionLabel={walletId === selectedWalletId ? "Continue" : undefined}
            key={walletId}
            onAction={(id) => (id === "passkey-wallet" ? onInstall(id) : onConnect(id))}
            onSelect={onSelect}
            recommended={walletId === recommendation.primaryWalletId}
            selected={walletId === selectedWalletId}
            walletId={walletId}
          />
        ))}
      </div>
      <PrimaryActions
        primary={wallets[selectedWalletId].type === "embedded" ? "Try future route" : "Install or connect wallet"}
        onPrimary={() => onInstall(selectedWalletId)}
        secondary="Back"
        onSecondary={onBack}
      />
    </ScreenFrame>
  );
}

function InstallWalletScreen({
  walletId,
  onBack,
  onDone,
  onFuture,
}: {
  walletId: WalletId;
  onBack: () => void;
  onDone: () => void;
  onFuture: () => void;
}) {
  const wallet = wallets[walletId];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Install wallet"
        title={`Set up ${wallet.shortName}`}
        body="This is a simulated install flow. No app store, wallet connection, or real account setup is used."
        onBack={onBack}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {["Install wallet app", "Create or restore wallet", "Return to Reinforce"].map((step, index) => (
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm" key={step}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
              {index + 1}
            </span>
            <h2 className="mt-5 text-lg font-semibold text-slate-950">{step}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {index === 1
                ? "Never share your recovery phrase. Reinforce will not ask for it."
                : "The prototype marks this step complete when you click continue."}
            </p>
          </article>
        ))}
      </div>
      <PrimaryActions
        primary={`${wallet.shortName} installed`}
        onPrimary={onDone}
        secondary="Try future passkey route"
        onSecondary={onFuture}
      />
    </ScreenFrame>
  );
}

function ConnectWalletScreen({
  blockerId,
  walletId,
  onBack,
  onBlockerAction,
  onConnect,
  onHelp,
}: {
  blockerId: BlockerId;
  walletId: WalletId;
  onBack: () => void;
  onBlockerAction: (action: string) => void;
  onConnect: () => void;
  onHelp: () => void;
}) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Connect"
        title={`Connect ${wallets[walletId].shortName}`}
        body="This is a UI-only connection step. A real integration would plug wallet detection and permissions here."
        onBack={onBack}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <WalletCard walletId={walletId} recommended />
        <TrustCuePanel onOpenProof={onHelp} />
      </div>
      <BlockerStateCard
        blockerId={blockerId === "wallet-not-detected" ? blockerId : "none"}
        onAction={onBlockerAction}
      />
      <PrimaryActions primary="Connect wallet" onPrimary={onConnect} secondary="Get help" onSecondary={onHelp} />
    </ScreenFrame>
  );
}

function TransferScreen({
  blockerId,
  device,
  exchangeId,
  timelineIndex,
  onBack,
  onBlockerAction,
  onHelp,
  onOpenExchange,
  onProof,
  onSameDevice,
  onSent,
  onToast,
}: {
  blockerId: BlockerId;
  device: "mobile" | "desktop";
  exchangeId: ExchangeId;
  timelineIndex: number;
  onBack: () => void;
  onBlockerAction: (action: string) => void;
  onHelp: () => void;
  onOpenExchange: () => void;
  onProof: () => void;
  onSameDevice: () => void;
  onSent: () => void;
  onToast: (message: string) => void;
}) {
  const exchange = exchanges[exchangeId];
  const showBlocker =
    blockerId === "kyc-incomplete" || blockerId === "whitelist-cooldown" || blockerId === "wrong-network";

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow={device === "desktop" ? "Desktop transfer" : "Transfer"}
        title={`Move USDT from ${exchange.shortName}`}
        body="Copy or scan the transfer card, use TRON only, and return here after submitting the transfer."
        onBack={onBack}
        rightSlot={
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            onClick={onHelp}
            type="button"
          >
            Help
          </button>
        }
      />

      {showBlocker ? <BlockerStateCard blockerId={blockerId} onAction={onBlockerAction} /> : null}

      {device === "desktop" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <TransferCard
            exchange={exchange}
            intent={transferIntent}
            onOpenExchange={onOpenExchange}
            onSent={onSent}
            onToast={onToast}
          />
          <div className="space-y-4">
            <DesktopModePanel exchangeId={exchange.id} onToast={onToast} />
            <ProgressTimeline activeIndex={timelineIndex} steps={timelineSteps} />
            <TrustCuePanel onOpenProof={onProof} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <TransferCard
            compact
            exchange={exchange}
            intent={transferIntent}
            onOpenExchange={onOpenExchange}
            onSent={onSent}
            onToast={onToast}
          />
          <button
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            onClick={onSameDevice}
            type="button"
          >
            I am on the same device and cannot scan QR
          </button>
          <TrustCuePanel onOpenProof={onProof} />
        </div>
      )}
    </ScreenFrame>
  );
}

function DesktopModePanel({ exchangeId, onToast }: { exchangeId: ExchangeId; onToast: (message: string) => void }) {
  const exchange = exchanges[exchangeId];

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Desktop modes
      </p>
      <div className="mt-4 space-y-3">
        {[exchange.desktopMode, "Continue on phone", "I have a wallet extension"].map((mode) => (
          <button
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            key={mode}
            onClick={() => onToast(`${mode} selected`)}
            type="button"
          >
            {mode}
          </button>
        ))}
      </div>
      <button
        className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        onClick={() => onToast("Link sent to phone in demo")}
        type="button"
      >
        Send link to phone
      </button>
    </section>
  );
}

function SameDeviceScreen({
  exchangeId,
  onBack,
  onOpen,
  onRestore,
  onSent,
  onToast,
}: {
  exchangeId: ExchangeId;
  onBack: () => void;
  onOpen: () => void;
  onRestore: () => void;
  onSent: () => void;
  onToast: (message: string) => void;
}) {
  const exchange = exchanges[exchangeId];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Same-device mode"
        title="Copy first, then open your exchange"
        body="QR scanning may not work when the browser and exchange app are on the same phone. This mode saves the transfer intent and prioritizes large copy actions."
        onBack={onBack}
      />
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            className="rounded-[1.5rem] bg-slate-950 px-5 py-6 text-left text-white"
            onClick={() => onToast("Address copied")}
            type="button"
          >
            <span className="text-sm font-semibold text-slate-300">Step 1</span>
            <span className="mt-2 block text-xl font-semibold">Copy address</span>
            <span className="mt-3 block break-all font-mono text-xs text-slate-300">
              {transferIntent.destinationAddress}
            </span>
          </button>
          <button
            className="rounded-[1.5rem] bg-emerald-600 px-5 py-6 text-left text-white"
            onClick={() => onToast("Amount copied")}
            type="button"
          >
            <span className="text-sm font-semibold text-emerald-100">Step 2</span>
            <span className="mt-2 block text-xl font-semibold">Copy amount</span>
            <span className="mt-3 block text-sm text-emerald-50">{transferIntent.amount} USDT</span>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button className="secondary-button" onClick={() => onToast("Transfer card saved")} type="button">
            Save transfer card
          </button>
          <button className="primary-button" onClick={onOpen} type="button">
            {exchange.openLabel}
          </button>
          <button className="secondary-button" onClick={onRestore} type="button">
            I returned
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoNotice title="May depend on your exchange app" body="Some exchanges can reopen with copied details. This prototype does not guarantee deep links." />
          <InfoNotice title="Not always available" body="QR-from-photo or app handoff behavior varies by phone and exchange app." />
        </div>
      </section>
      <PrimaryActions primary="I have sent it" onPrimary={onSent} secondary="Back to transfer card" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function ExchangeInstructionsScreen({
  blockerId,
  exchangeId,
  onAction,
  onBack,
  onSent,
}: {
  blockerId: BlockerId;
  exchangeId: ExchangeId;
  onAction: (action: string) => void;
  onBack: () => void;
  onSent: () => void;
}) {
  const exchange = exchanges[exchangeId];
  const blocked = blockerId === "whitelist-cooldown" || blockerId === "kyc-incomplete";

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Exchange instructions"
        title={`${exchange.shortName}: send USDT on TRON`}
        body="These are exchange-specific instructions written for non-technical users."
        onBack={onBack}
      />
      {blocked ? <BlockerStateCard blockerId={blockerId} onAction={onAction} /> : null}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <ol className="space-y-4">
          {exchange.instructions.map((instruction, index) => (
            <li className="flex gap-4 rounded-2xl bg-slate-50 p-4" key={instruction}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-6 text-slate-800">{instruction}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Use TRON only. Wrong network can cause loss.
        </div>
      </section>
      <PrimaryActions primary="I have sent it" onPrimary={onSent} secondary="Back" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function WaitingScreen({
  blockerId,
  timelineIndex,
  onAction,
  onBack,
  onDetected,
  onHelp,
  onNudge,
}: {
  blockerId: BlockerId;
  timelineIndex: number;
  onAction: (action: string) => void;
  onBack: () => void;
  onDetected: () => void;
  onHelp: () => void;
  onNudge: () => void;
}) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Waiting"
        title="We will watch for your transfer"
        body="The page stays useful while the exchange processes the withdrawal and the wallet receives USDT."
        onBack={onBack}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ProgressTimeline activeIndex={timelineIndex} steps={timelineSteps} />
        <div className="space-y-4">
          {blockerId === "transfer-pending" ? (
            <BlockerStateCard blockerId={blockerId} onAction={onAction} />
          ) : (
            <InfoNotice
              title="Transfer intent saved"
              body={`Intent ${transferIntent.id} is restored when you return from the exchange.`}
            />
          )}
          <button className="secondary-button w-full" onClick={onHelp} type="button">
            Open help
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="secondary-button" onClick={onNudge} type="button">
          Simulate next status
        </button>
        <button className="primary-button" onClick={onDetected} type="button">
          Funds detected
        </button>
      </div>
    </ScreenFrame>
  );
}

function FundsDetectedScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Funds detected"
        title="Your USDT has arrived"
        body="The wallet received USDT on TRON. You can review the details before starting xUSD."
        onBack={onBack}
      />
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft">
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
          Confirmed
        </span>
        <h2 className="mt-4 text-3xl font-semibold text-emerald-950">{transferIntent.amount} USDT</h2>
        <p className="mt-2 text-sm font-semibold text-emerald-800">
          Received today at 10:09. Tx hash 0x7ac...0de
        </p>
        <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
          Your wallet stays in your control. The next step moves your available USDT into xUSD.
        </div>
      </section>
      <PrimaryActions primary="Start earning" onPrimary={onStart} secondary="Back" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function ActivationScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Activation"
        title="We will cover your first setup step"
        body="Reinforce presents this as a simple setup moment. Advanced network details stay behind help until needed."
        onBack={onBack}
      />
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
          <p className="text-sm font-semibold text-slate-300">Ready to earn</p>
          <h2 className="mt-3 text-3xl font-semibold">Start earning</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Your USDT will become xUSD. You can withdraw back to USDT from the portfolio.
          </p>
        </div>
        <details className="mt-4 rounded-2xl bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-950">
            Advanced explanation
          </summary>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Some wallets need a tiny network balance for the first activation. In the preferred
            route, Reinforce covers this setup step.
          </p>
        </details>
      </section>
      <PrimaryActions primary="Start earning" onPrimary={onStart} secondary="Back" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function MissingTrxScreen({
  onAction,
  onBack,
}: {
  onAction: (action: string) => void;
  onBack: () => void;
}) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Fallback"
        title="Your wallet needs a tiny TRX balance to continue"
        body="This branch shows the non-preferred fallback. It avoids raw network jargon on first pass and keeps help available."
        onBack={onBack}
      />
      <BlockerStateCard blockerId="missing-trx" onAction={onAction} />
      <details className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-950">
          Advanced explanation
        </summary>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          TRON wallets sometimes need a small TRX balance to approve the first setup step. This
          prototype keeps that explanation behind help instead of making it the default user copy.
        </p>
      </details>
    </ScreenFrame>
  );
}

function PortfolioScreen({
  onAdd,
  onProof,
  onWithdraw,
}: {
  onAdd: () => void;
  onProof: () => void;
  onWithdraw: () => void;
}) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Portfolio"
        title="Your xUSD is earning"
        body="A calm portfolio view focused on status, reversibility, and next actions."
      />
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Total xUSD balance" value={portfolio.xusdBalance} suffix="xUSD" />
          <Metric label="Current APY" value={portfolio.apy} />
          <Metric label="Available USDT in wallet" value={portfolio.usdtAvailable} suffix="USDT" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Earning active
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Demo balance
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button className="primary-button" onClick={onAdd} type="button">
            Add more USDT
          </button>
          <button className="secondary-button" onClick={onWithdraw} type="button">
            Withdraw back to USDT
          </button>
          <button className="secondary-button" onClick={onProof} type="button">
            Proof and transparency
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Transaction history</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {historyRecords.map((record) => (
            <div className="flex items-center justify-between gap-4 py-4" key={record.id}>
              <div>
                <p className="text-sm font-semibold text-slate-950">{record.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {record.subtitle} · {record.timestamp} · {record.hash}
                </p>
              </div>
              <p className="text-right text-sm font-semibold text-slate-900">{record.amount}</p>
            </div>
          ))}
        </div>
      </section>
    </ScreenFrame>
  );
}

function AddMoreScreen({
  exchangeId,
  onBack,
  onOpenExchange,
  onSent,
  onToast,
}: {
  exchangeId: ExchangeId;
  onBack: () => void;
  onOpenExchange: () => void;
  onSent: () => void;
  onToast: (message: string) => void;
}) {
  const exchange = exchanges[exchangeId];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Add more"
        title="Add more USDT to xUSD"
        body="Returning users skip wallet education and go straight to a reusable transfer card."
        onBack={onBack}
      />
      <TransferCard
        exchange={exchange}
        intent={{ ...transferIntent, amount: "500.00" }}
        onOpenExchange={onOpenExchange}
        onSent={onSent}
        onToast={onToast}
      />
    </ScreenFrame>
  );
}

function WithdrawScreen({
  ready,
  onBack,
  onConfirm,
  onDone,
}: {
  ready: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onDone: () => void;
}) {
  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Withdraw"
        title="Withdraw back to USDT"
        body="The copy stays plain and reversible. This is a UI-only preview with mock balances."
        onBack={onBack}
      />
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <Metric label="Available to withdraw" value="1,248.63" suffix="xUSD" />
          <Metric label="You receive" value="1,247.90" suffix="USDT" />
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Destination</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-600">
            TR9fE3yQd8n8pX4R6A2vS7mQ1cK9zH5aRb
          </p>
        </div>
        <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Withdrawals return to USDT in your wallet.
        </div>
      </section>
      <PrimaryActions
        primary={ready ? "Submit mock withdrawal" : "Preview withdrawal"}
        onPrimary={ready ? onDone : onConfirm}
        secondary="Back to portfolio"
        onSecondary={onBack}
      />
    </ScreenFrame>
  );
}

function ProofScreen({ onBack, onHelp }: { onBack: () => void; onHelp: () => void }) {
  const topics = [
    ["How xUSD works", "USDT moves into xUSD so the portfolio can show one earning balance."],
    ["Why TRON only", "This prototype keeps one network path to reduce user mistakes."],
    ["Your wallet stays in your control", "You receive USDT in your wallet before starting earning."],
    ["How to verify a transfer", "Use the transaction hash and destination address shown in history."],
    ["Why first activation may need network coverage", "Some wallets need setup coverage before the first action."],
    ["How to withdraw back to USDT", "Use the withdraw flow from portfolio and review the destination wallet."],
    ["Security reminders", "Never share recovery phrases or send to an address from chat."],
    ["Scam warnings", "Use only the address shown inside Reinforce and verify TRON / TRC20."],
  ];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Proof"
        title="Proof and transparency"
        body="Trust screens explain the product without turning onboarding into a trading or DeFi interface."
        onBack={onBack}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {topics.map(([title, body]) => (
          <details className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm" key={title}>
            <summary className="cursor-pointer text-base font-semibold text-slate-950">{title}</summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          </details>
        ))}
      </div>
      <PrimaryActions primary="Open help" onPrimary={onHelp} secondary="Back" onSecondary={onBack} />
    </ScreenFrame>
  );
}

function FutureWalletScreen({
  step,
  onBack,
  onNext,
  onUseClassic,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  onUseClassic: () => void;
}) {
  const steps = [
    {
      title: "Create an earning wallet with passkey",
      body: "A future path where users can create an earning wallet without installing a separate wallet app.",
    },
    {
      title: "Confirm recovery preferences",
      body: "The prototype explains recovery in consumer language before any money moves.",
    },
    {
      title: "Passkey wallet ready",
      body: "The user can now receive USDT on TRON and start earning from the same flow.",
    },
  ];

  return (
    <ScreenFrame>
      <StepHeader
        eyebrow="Future route"
        title={steps[step].title}
        body={steps[step].body}
        onBack={onBack}
      />
      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-5 shadow-soft">
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
          Future route
        </span>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {steps.map((item, index) => (
            <div
              className={`rounded-2xl p-4 ${
                index <= step ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600"
              }`}
              key={item.title}
            >
              <span className="text-xs font-semibold">Step {index + 1}</span>
              <p className="mt-2 text-sm font-semibold">{item.title}</p>
            </div>
          ))}
        </div>
      </section>
      <PrimaryActions
        primary={step < 2 ? "Continue" : "Use passkey wallet"}
        onPrimary={onNext}
        secondary="Use wallet app instead"
        onSecondary={onUseClassic}
      />
    </ScreenFrame>
  );
}

function PrimaryActions({
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  primary: string;
  secondary?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button className="primary-button" onClick={onPrimary} type="button">
        {primary}
      </button>
      {secondary && onSecondary ? (
        <button className="secondary-button" onClick={onSecondary} type="button">
          {secondary}
        </button>
      ) : null}
    </div>
  );
}

function MiniBlockerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      Simulate: {label}
    </button>
  );
}

function InfoNotice({ body, title }: { body: string; title: string }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">
        {value}
        {suffix ? <span className="ml-2 text-sm font-semibold text-slate-500">{suffix}</span> : null}
      </p>
    </div>
  );
}
