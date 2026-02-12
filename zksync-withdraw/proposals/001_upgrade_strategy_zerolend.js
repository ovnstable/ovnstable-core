const { Interface, getAddress } = require("ethers");
const {
  createProposalContext,
  loadDeployment,
} = require("./lib/proposal-tools");

const assets = require("../utils/assets");
const { Provider, Contract } = require("zksync-ethers");



async function main() {
  const rpc =
    process.env.ZKSYNC_RPC_URL ||
    (hre.network && hre.network.config && hre.network.config.url) ||
    "http://127.0.0.1:8011";
  const pk = process.env.PRIVATE_KEY;
  const provider = new Provider(rpc);

  const zerolendUSDTAddress = "0x1d48b4612EbA39b7C073abE1f71d5dF79574869A";

  const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

  const deployment = loadDeployment("StrategyZerolend");
  const USDCstrategyProxy = getAddress(deployment.address);
  const strategyOldImpL = getAddress(process.env.OLD_IMPL || deployment.implementation);
  const strategyNewImpL = getAddress(process.env.NEW_IMPL || "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71");
  const iface = new Interface(["function upgradeTo(address)", "function unstakeFull()"]);
  const strategyView = new Contract(
    USDCstrategyProxy,
    ["function usdc() view returns (address)", "function z0USDC() view returns (address)"],
    provider,
  );
  const usdcToken = await strategyView.usdc();
  const z0UsdcToken = await strategyView.z0USDC();
  const sep = "-".repeat(process.stdout.columns || 80);

  const proposal = createProposalContext();
  proposal.addProposalItem(USDCstrategyProxy, iface.encodeFunctionData("upgradeTo", [strategyNewImpL]), [], 0n, "upgradeTo(new)");
  proposal.addProposalItem(USDCstrategyProxy, iface.encodeFunctionData("unstakeFull"), [], 0n, "unstakeFull()");
  proposal.addProposalItem(USDCstrategyProxy, iface.encodeFunctionData("upgradeTo", [strategyOldImpL]), [], 0n, "upgradeTo(old)");

  // ======================= LOGS =======================

  console.log(sep);
  console.log("[balances] before proposal");
  await logBalance(USDCstrategyProxy, "zerolendUSDCAddress", z0UsdcToken);
  await logBalance(USDCstrategyProxy, "zerolendUSDCAddress", usdcToken);
  await logBalance(zerolendUSDTAddress, "zerolendUSDTAddress", assets.Z0USDT);
  await logBalance(wal, "wal", z0UsdcToken);
  await logBalance(wal, "wal", usdcToken);
  console.log(sep);

  // ======================= TEST PROPOSAL =======================

  await proposal.testProposal();

  // ======================= LOGS =======================

  console.log(sep);
  console.log("[balances] after proposal");
  await logBalance(USDCstrategyProxy, "zerolendUSDCAddress", z0UsdcToken);
  await logBalance(USDCstrategyProxy, "zerolendUSDCAddress", usdcToken);
  await logBalance(zerolendUSDTAddress, "zerolendUSDTAddress", assets.Z0USDT);
  await logBalance(wal, "wal", z0UsdcToken);
  await logBalance(wal, "wal", usdcToken);
  console.log(sep);


  // ======================= FUNCS =======================
  async function logBalance(address, label, token) {
      const ERC20_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ];
      const tokenContract = new Contract(token, ERC20_ABI, provider);
      const tokenBalance = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();
      const divisor = BigInt(10) ** BigInt(decimals);
      const formatted = Number(tokenBalance) / Number(divisor);
      console.log(`Balance of ${label} (${symbol}): ${formatted.toString()}`);
    }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
