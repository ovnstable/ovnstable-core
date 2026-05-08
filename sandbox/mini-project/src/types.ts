export type DeviceType = "mobile" | "desktop";

export type ExchangeId =
  | "binance"
  | "okx"
  | "bybit"
  | "bitget"
  | "gate"
  | "kucoin"
  | "mexc"
  | "other";

export type WalletState = "existing" | "none" | "walletless";

export type WalletId =
  | "tronlink"
  | "trust"
  | "okx-wallet"
  | "bitget-wallet"
  | "gate-web3"
  | "binance-wallet"
  | "bybit-web3"
  | "other-wallet"
  | "passkey-wallet";

export type BlockerId =
  | "none"
  | "missing-trx"
  | "whitelist-cooldown"
  | "kyc-incomplete"
  | "transfer-pending"
  | "wrong-network"
  | "wallet-not-detected"
  | "unsupported-wallet";

export type Feasibility =
  | "build-now"
  | "engineering-heavy"
  | "partner-enabled"
  | "future-research";

export type ScreenId =
  | "landing"
  | "exchange"
  | "wallet-state"
  | "route"
  | "wallet-recommendation"
  | "install-wallet"
  | "connect-wallet"
  | "transfer"
  | "same-device"
  | "exchange-instructions"
  | "waiting"
  | "funds-detected"
  | "activation"
  | "missing-trx"
  | "portfolio"
  | "add-more"
  | "withdraw"
  | "proof"
  | "future-wallet"
  | "blocker";

export type Exchange = {
  id: ExchangeId;
  name: string;
  shortName: string;
  color: string;
  openLabel: string;
  desktopMode: string;
  instructions: string[];
};

export type Wallet = {
  id: WalletId;
  name: string;
  shortName: string;
  type: "browser" | "mobile" | "exchange" | "embedded" | "other";
  feasibility: Feasibility;
  badge?: string;
  plainCopy: string;
  caution?: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  state: UserRouteState;
  startScreen?: ScreenId;
};

export type UserRouteState = {
  device: DeviceType;
  exchangeId: ExchangeId;
  walletState: WalletState;
  walletId?: WalletId;
  blockerId: BlockerId;
  sameDeviceMode?: boolean;
  returningUser?: boolean;
};

export type RouteRecommendation = {
  title: string;
  summary: string;
  primaryWalletId: WalletId;
  alternateWalletIds: WalletId[];
  feasibility: Feasibility;
  steps: string[];
  warnings: string[];
  futureAvailable: boolean;
};

export type TransferIntent = {
  id: string;
  asset: "USDT";
  network: "TRON / TRC20";
  destinationAddress: string;
  amount?: string;
  qrSeed: string;
  createdAt: string;
};

export type TimelineStep = {
  id: string;
  label: string;
  detail: string;
};

export type PortfolioState = {
  xusdBalance: string;
  apy: string;
  usdtAvailable: string;
  status: "active" | "setup";
};

export type HistoryRecord = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  timestamp: string;
  hash: string;
};
