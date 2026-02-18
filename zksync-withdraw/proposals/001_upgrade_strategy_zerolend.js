const { Interface, getAddress } = require("ethers");
const {
  createProposalContext,
  loadDeployment,
  resolveAgentTimelockAddress,
  resolveRpcUrl,
} = require("./lib/proposal-tools");
const { Provider, Contract } = require("zksync-ethers");

const assets = require("../utils/assets");
const pools = require("../utils/pools");

const { Z0USDC, Z0USDT, USDC, USDT } = assets;

async function main() {
  // ======================= ENV / CONTEXT =======================
  const rpc = resolveRpcUrl();
  const provider = new Provider(rpc);
  const timelock = getAddress(resolveAgentTimelockAddress());
  const sep = "-".repeat(process.stdout.columns || 80);

  const proposal = createProposalContext();
  const createProposal = proposal.createProposal;
  const testProposal = proposal.testProposal;

  // ======================= USD+ TARGET =========================
  const usdPlusProxy = "0x8E86e46278518EFc1C5CEd245cBA2C7e3ef11557";

  const usdPlusOldImpl = "0x5f5De9763a452890e1BD46F54d764099Cc79581E";
  const usdPlusNewImpl = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71";

  const usdPlusIface = new Interface([
    "function upgradeTo(address)",
    "function nukeSupply()",
  ]);

  // ======================= PROPOSAL ITEMS =======================
  
  const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

  const usdcDeployment = loadDeployment("StrategyZerolend");
  const usdtDeployment = loadDeployment("StrategyZerolendUsdt");
  const usdcStrategyProxy = getAddress(usdcDeployment.address);
  const usdtStrategyProxy = getAddress(usdtDeployment.address);
  
  const iface = new Interface([
    "function upgradeTo(address)",
    "function unstake(address _asset, uint256 _amount, address _beneficiary, bool _targetIsZero) returns (uint256)",
  ]);
  
  const usdcStrategyView = new Contract(
    usdcStrategyProxy,
    [
      "function usdc() view returns (address)",
      "function z0USDC() view returns (address)",
      "function portfolioManager() view returns (address)",
      "function roleManager() view returns (address)",
      "function setStrategyParams(address _portfolioManager, address _roleManager)",
    ],
    provider,
  );
  const usdtStrategyView = new Contract(
    usdtStrategyProxy,
    [
      "function usdt() view returns (address)",
      "function z0USDT() view returns (address)",
      "function portfolioManager() view returns (address)",
      "function roleManager() view returns (address)",
      "function setStrategyParams(address _portfolioManager, address _roleManager)",
    ],
    provider,
  );
  // const usdcToken = await usdcStrategyView.usdc();
  // const z0UsdcToken = await usdcStrategyView.z0USDC();
  const oldPortfolioManagerUsdc = getAddress(await usdcStrategyView.portfolioManager());
  const roleManagerUsdc = getAddress(await usdcStrategyView.roleManager());
  // const usdtToken = await usdtStrategyView.usdt();
  // const z0UsdtToken = await usdtStrategyView.z0USDT();
  const oldPortfolioManagerUsdt = getAddress(await usdtStrategyView.portfolioManager());
  const roleManagerUsdt = getAddress(await usdtStrategyView.roleManager());
  
  const usdcStrategyZ0Balance = await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", Z0USDC);
  const usdtStrategyZ0Balance = await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", Z0USDT);
  
  proposal.addProposalItem(
    usdcStrategyProxy,
    usdcStrategyView.interface.encodeFunctionData("setStrategyParams", [timelock, roleManagerUsdc]),
    [],
    0n,
    "USDC setStrategyParams(timelock)",
  );
  proposal.addProposalItem(
    usdcStrategyProxy,
    iface.encodeFunctionData("unstake", [USDC, usdcStrategyZ0Balance, wal, true]),
    [],
    0n,
    "USDC unstake()",
  );
  proposal.addProposalItem(
    usdcStrategyProxy,
    usdcStrategyView.interface.encodeFunctionData("setStrategyParams", [oldPortfolioManagerUsdc, roleManagerUsdc]),
    [],
    0n,
    "USDC setStrategyParams(oldPortfolioManager)",
  );
  proposal.addProposalItem(
    usdtStrategyProxy,
    usdtStrategyView.interface.encodeFunctionData("setStrategyParams", [timelock, roleManagerUsdt]),
    [],
    0n,
    "USDT setStrategyParams(timelock)",
  );
  proposal.addProposalItem(
    usdtStrategyProxy,
    iface.encodeFunctionData("unstake", [USDT, usdtStrategyZ0Balance, wal, true]),
    [],
    0n,
    "USDT unstake()",
  );
  proposal.addProposalItem(
    usdtStrategyProxy,
    usdtStrategyView.interface.encodeFunctionData("setStrategyParams", [oldPortfolioManagerUsdt, roleManagerUsdt]),
    [],
    0n,
    "USDT setStrategyParams(oldPortfolioManager)",
  );
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
  proposal.addProposalItem(
    usdPlusProxy,
    usdPlusIface.encodeFunctionData("upgradeTo", [usdPlusOldImpl]),
    [],
    0n,
    "USD+ upgradeTo(new)",
  );

  // ======================= LOGS =======================

  // await logBalance(usdcStrategyProxy, "zerolendUSDCAddress", Z0USDC);
  // await logBalance(usdtStrategyProxy, "zerolendUSDTAddress", Z0USDT);
  await logBalance(wal, "WAL", USDC);
  await logBalance(wal, "WAL", USDT);
  await logBalance(pools.MUTE, "MUTE", USDC);
  await logBalance(pools.SWAPSYNC, "SYNC", USDC);
  await logBalance(pools.PANCAKE, "PANCAKE", USDC);
  await logBalance(pools.EZKALIBUR, "EZKALIBUR", USDC);
  await logBalance(pools.VESYNC, "VESYNC", USDC);
  await logBalance(pools.KYBER, "KYBER", USDC);


  // ======================= EXECUTION ============================
  console.log(sep);
  console.log(`[proposal] rpc: ${rpc}`);
  console.log(`[proposal] timelock: ${timelock}`);
  console.log(`[proposal] usdPlus proxy: ${usdPlusProxy}`);
  console.log(`[proposal] usdPlus new impl: ${usdPlusNewImpl}`);
  console.log(sep);

  await testProposal({ rpcUrl: rpc, timelockAddress: timelock, solidityConsole: true });
  await createProposal();

  // ======================= LOGS =======================
  // console.log(sep);


  await logBalance(wal, "WAL", USDC);
  await logBalance(wal, "WAL", USDT);
  await logBalance(pools.MUTE, "MUTE", USDC);
  await logBalance(pools.SWAPSYNC, "SYNC", USDC);
  await logBalance(pools.PANCAKE, "PANCAKE", USDC);
  await logBalance(pools.EZKALIBUR, "EZKALIBUR", USDC);
  await logBalance(pools.VESYNC, "VESYNC", USDC);
  await logBalance(pools.KYBER, "KYBER", USDC);


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
