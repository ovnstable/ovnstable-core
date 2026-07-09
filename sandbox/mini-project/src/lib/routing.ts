import { blockers, exchanges, wallets } from "../data/mockData";
import type {
  BlockerId,
  ExchangeId,
  RouteRecommendation,
  UserRouteState,
  WalletId,
} from "../types";

const partnerWalletByExchange: Partial<Record<ExchangeId, WalletId>> = {
  okx: "okx-wallet",
  bitget: "bitget-wallet",
  gate: "gate-web3",
};

const exchangeWalletByExchange: Partial<Record<ExchangeId, WalletId>> = {
  binance: "binance-wallet",
  bybit: "bybit-web3",
};

export function getRouteRecommendation(state: UserRouteState): RouteRecommendation {
  const exchange = exchanges[state.exchangeId];

  if (state.walletState === "walletless" || state.walletId === "passkey-wallet") {
    return {
      title: "Create an earning wallet with passkey",
      summary:
        "A future route where Reinforce creates a wallet-like experience without asking you to install a wallet app.",
      primaryWalletId: "passkey-wallet",
      alternateWalletIds: ["trust", "tronlink"],
      feasibility: "future-research",
      steps: ["Create passkey", "Receive USDT on TRON", "Start earning"],
      warnings: ["Future route", "Partner and recovery design still needs validation"],
      futureAvailable: true,
    };
  }

  if (state.walletState === "existing" && state.walletId) {
    const wallet = wallets[state.walletId];
    const warnings = wallet.caution ? [wallet.caution] : [];

    if (state.walletId === "other-wallet") {
      warnings.push("Confirm this wallet can receive USDT on TRON before sending.");
    }

    return {
      title: `Use ${wallet.shortName} with ${exchange.shortName}`,
      summary:
        "Keep your wallet in your control. Reinforce watches for your transfer and guides the setup step.",
      primaryWalletId: state.walletId,
      alternateWalletIds: state.walletId === "tronlink" ? ["trust"] : ["tronlink", "trust"],
      feasibility: wallet.feasibility,
      steps: ["Connect wallet", `Move USDT from ${exchange.shortName}`, "Start earning"],
      warnings,
      futureAvailable: true,
    };
  }

  const partnerWallet = partnerWalletByExchange[state.exchangeId];
  const primaryWalletId = partnerWallet ?? "trust";
  const alternateWalletIds: WalletId[] = partnerWallet
    ? ["trust", "tronlink"]
    : ["tronlink", exchangeWalletByExchange[state.exchangeId] ?? "other-wallet"];
  const wallet = wallets[primaryWalletId];

  return {
    title: `Set up ${wallet.shortName}`,
    summary:
      partnerWallet
        ? `${wallet.shortName} is the lowest-friction route for ${exchange.shortName} users in this prototype.`
        : "Trust Wallet is the default simple route. TronLink remains available for users who prefer a TRON-native wallet.",
    primaryWalletId,
    alternateWalletIds,
    feasibility: wallet.feasibility,
    steps: ["Install wallet", `Move USDT from ${exchange.shortName}`, "Start earning"],
    warnings: [],
    futureAvailable: true,
  };
}

export function getBlocker(blockerId: BlockerId) {
  return blockers[blockerId];
}

export function shouldShowUnsupportedWarning(walletId?: WalletId) {
  return walletId === "binance-wallet" || walletId === "bybit-web3" || walletId === "other-wallet";
}
