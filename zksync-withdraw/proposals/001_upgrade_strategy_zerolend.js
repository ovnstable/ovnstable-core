const fs = require("fs");
const path = require("path");
const { Interface, getAddress } = require("ethers");
const {
  createProposalContext,
  loadDeployment,
  resolveAgentTimelockAddress,
  resolveRpcUrl,
} = require("./lib/proposal-tools");
const { Provider, Contract } = require("zksync-ethers");

const assets = require("../utils/assets");

async function main() {
  // ======================= ENV / CONTEXT =======================
  const rpc = resolveRpcUrl();
  const provider = new Provider(rpc);
  const timelock = getAddress(resolveAgentTimelockAddress());
  const sep = "-".repeat(process.stdout.columns || 80);

  const proposal = createProposalContext();

  // ======================= USD+ TARGET =========================
  const usdPlusOldImpl = "0x5f5De9763a452890e1BD46F54d764099Cc79581E";
  const usdPlusProxy = "0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557";

  // Set env NEW_IMPL_USDPLUS or replace placeholder manually
  const usdPlusNewImpl = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71"; // placeholder, must be set to actual new implementation address

  const usdPlusIface = new Interface([
    "function upgradeTo(address)",
    "function nukeSupply()",
  ]);

  // ======================= PROPOSAL ITEMS =======================
  proposal.addProposalItem(
    usdPlusProxy,
    usdPlusIface.encodeFunctionData("upgradeTo", [usdPlusNewImpl]),
    [],
    0n,
    "USD+ upgradeTo(new)",
  );

  proposal.addProposalItem(
    usdPlusProxy,
    usdPlusIface.encodeFunctionData("nukeSupply", []),
    [],
    0n,
    "USD+ nukeSupply()",
  );

  // ======================= LEGACY (DISABLED) ====================
  // Strategy actions are intentionally disabled for this proposal.
  // Kept for history/debug and can be re-enabled later if needed.

  const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
  const poolMute = "0x3848dbd3EAc429497abd464A18fBEC78EF76f750";
  const poolSync = "0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306";
  // const usdcDeployment = loadDeployment("StrategyZerolend");
  // const usdtDeployment = loadDeployment("StrategyZerolendUsdt");
  // const usdcStrategyProxy = getAddress(usdcDeployment.address);
  // const usdtStrategyProxy = getAddress(usdtDeployment.address);
  // const strategyOldImpL = getAddress(process.env.OLD_IMPL || usdcDeployment.implementation);
  // const strategyNewImpL = getAddress(process.env.NEW_IMPL || "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71");
  // const iface = new Interface([
  //   "function upgradeTo(address)",
  //   "function unstake(address _asset, uint256 _amount, address _beneficiary, bool _targetIsZero) returns (uint256)",
  // ]);
  //
  // const usdcStrategyView = new Contract(
  //   usdcStrategyProxy,
  //   [
  //     "function usdc() view returns (address)",
  //     "function z0USDC() view returns (address)",
  //     "function portfolioManager() view returns (address)",
  //     "function roleManager() view returns (address)",
  //     "function setStrategyParams(address _portfolioManager, address _roleManager)",
  //   ],
  //   provider,
  // );
  // const usdtStrategyView = new Contract(
  //   usdtStrategyProxy,
  //   [
  //     "function usdt() view returns (address)",
  //     "function z0USDT() view returns (address)",
  //     "function portfolioManager() view returns (address)",
  //     "function roleManager() view returns (address)",
  //     "function setStrategyParams(address _portfolioManager, address _roleManager)",
  //   ],
  //   provider,
  // );
  // const usdcToken = await usdcStrategyView.usdc();
  // const z0UsdcToken = await usdcStrategyView.z0USDC();
  // const oldPortfolioManagerUsdc = getAddress(await usdcStrategyView.portfolioManager());
  // const roleManagerUsdc = getAddress(await usdcStrategyView.roleManager());
  // const usdtToken = await usdtStrategyView.usdt();
  // const z0UsdtToken = await usdtStrategyView.z0USDT();
  // const oldPortfolioManagerUsdt = getAddress(await usdtStrategyView.portfolioManager());
  // const roleManagerUsdt = getAddress(await usdtStrategyView.roleManager());
  //
  // const usdcStrategyZ0Balance = await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", z0UsdcToken);
  // const usdtStrategyZ0Balance = await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", z0UsdtToken);
  //
  // proposal.addProposalItem(
  //   usdcStrategyProxy,
  //   usdcStrategyView.interface.encodeFunctionData("setStrategyParams", [timelock, roleManagerUsdc]),
  //   [],
  //   0n,
  //   "USDC setStrategyParams(timelock)",
  // );
  // proposal.addProposalItem(
  //   usdcStrategyProxy,
  //   iface.encodeFunctionData("unstake", [usdcToken, usdcStrategyZ0Balance, wal, true]),
  //   [],
  //   0n,
  //   "USDC unstake()",
  // );
  // proposal.addProposalItem(
  //   usdcStrategyProxy,
  //   usdcStrategyView.interface.encodeFunctionData("setStrategyParams", [oldPortfolioManagerUsdc, roleManagerUsdc]),
  //   [],
  //   0n,
  //   "USDC setStrategyParams(oldPortfolioManager)",
  // );
  // proposal.addProposalItem(
  //   usdtStrategyProxy,
  //   usdtStrategyView.interface.encodeFunctionData("setStrategyParams", [timelock, roleManagerUsdt]),
  //   [],
  //   0n,
  //   "USDT setStrategyParams(timelock)",
  // );
  // proposal.addProposalItem(
  //   usdtStrategyProxy,
  //   iface.encodeFunctionData("unstake", [usdtToken, usdtStrategyZ0Balance, wal, true]),
  //   [],
  //   0n,
  //   "USDT unstake()",
  // );
  // proposal.addProposalItem(
  //   usdtStrategyProxy,
  //   usdtStrategyView.interface.encodeFunctionData("setStrategyParams", [oldPortfolioManagerUsdt, roleManagerUsdt]),
  //   [],
  //   0n,
  //   "USDT setStrategyParams(oldPortfolioManager)",
  // );

  await logBalance(wal, "WAL", assets.USDC);
  await logBalance(poolMute, "MUTE", assets.USDC);
  await logBalance(poolSync, "SYNC", assets.USDC);

  // ======================= EXECUTION ============================
  console.log(sep);
  console.log(`[proposal] rpc: ${rpc}`);
  console.log(`[proposal] timelock: ${timelock}`);
  console.log(`[proposal] usdPlus proxy: ${usdPlusProxy}`);
  console.log(`[proposal] usdPlus new impl: ${usdPlusNewImpl}`);
  console.log(sep);

  await proposal.testProposal({ rpcUrl: rpc, timelockAddress: timelock });

  // ======================= LEGACY LOGS (DISABLED) ===============
  // console.log(sep);
  // console.log("[balances] before proposal");
  // await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", z0UsdcToken);
  // await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", usdcToken);
  // await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", z0UsdtToken);
  // await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", usdtToken);
  // await logBalance(wal, "wal", z0UsdcToken);
  // await logBalance(wal, "wal", usdcToken);
  // await logBalance(wal, "wal", z0UsdtToken);
  // await logBalance(wal, "wal", usdtToken);
  // console.log(sep);
  //
  // console.log(sep);
  // console.log("[balances] after proposal");
  // await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", z0UsdcToken);
  // await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", usdcToken);
  // await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", z0UsdtToken);
  // await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", usdtToken);
  // await logBalance(wal, "wal", z0UsdcToken);
  // await logBalance(wal, "wal", usdcToken);
  // await logBalance(wal, "wal", z0UsdtToken);
  // await logBalance(wal, "wal", usdtToken);
  // console.log(sep);

  await logBalance(wal, "WAL", assets.USDC);
  await logBalance(poolMute, "MUTE", assets.USDC);
  await logBalance(poolSync, "SYNC", assets.USDC);

  async function logBalance(address, label, token) {
    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ];
    const tokenContract = new Contract(token, ERC20_ABI, provider);
    const tokenBalance = await tokenContract.balanceOf(address);
    const decimals = await tokenContract.decimals();
    const symbol = await tokenContract.symbol();
    const divisor = BigInt(10) ** BigInt(decimals);
    const formatted = Number(tokenBalance) / Number(divisor);
    console.log(`Balance of ${label} (${symbol}): ${formatted.toString()}`);
    return tokenBalance;
  }

  // Keep loadDeployment imported and referenced in legacy block intentionally.
  void loadDeployment;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
