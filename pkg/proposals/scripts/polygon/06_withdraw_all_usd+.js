const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal } = require("@overnight-contracts/common/utils/governance");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { POLYGON, } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');


async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
  const timelock = '0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011';

  let UsdPlusToken = await getContract('UsdPlusToken', 'polygon');
  console.log("UsdPlusToken address: ", UsdPlusToken.address);
  const usdc = await ethers.getContractAt(IERC20, POLYGON.usdc);

  // ====================================================================
  const StrategyAaveV2Artifact = require('@overnight-contracts/strategies-polygon/artifacts/contracts/StrategyAaveV2.sol/StrategyAaveV2.json');
  const StrategyAaveV2 = await ethers.getContractAt(StrategyAaveV2Artifact.abi, '0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96');

  const oldImplAaveV2 = "0xC352822AFcE2aD256326b03ae797cc4F2ec25494";
  const newImplAaveV2 = "0xc991047d9bd4513274b74DBe82b94cc22252CB30";

  console.log("Current StrategyAaveV2 impl:", await getImplementationAddress(ethers.provider, StrategyAaveV2.address));

  // =========================== Unstake Aave Usdc ===========================

  addProposalItem(StrategyAaveV2, 'upgradeTo', [newImplAaveV2]);
  addProposalItem(StrategyAaveV2, 'unstakeFull', []);
  addProposalItem(StrategyAaveV2, 'upgradeTo', [oldImplAaveV2]);


  // const DYST_PAIR_ABI = [
  //   "function token0() view returns (address)",
  //   "function token1() view returns (address)",
  //   "function getReserves() view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)"
  // ];

  // const pairAddress = "0x421a018cc5839c4c0300afb21c725776dc389b1a";
  // const pair = await ethers.getContractAt(DYST_PAIR_ABI, pairAddress);

  // const [token0, token1, reserves] = await Promise.all([
  //   pair.token0(),
  //   pair.token1(),
  //   pair.getReserves()
  // ]);

  // console.log("token0: ", token0.toString());
  // console.log("token1: ", token1.toString());
  // console.log("reserves: ", ethers.utils.formatUnits(reserves[0], 6), ethers.utils.formatUnits(reserves[1], 6));

  // const SOLIDLY_ROUTER_ABI = [
  //   "function swapExactTokensForTokens(" +
  //     "uint256 amountIn," +
  //     "uint256 amountOutMin," +
  //     "tuple(address from,address to,bool stable)[] routes," +
  //     "address to," +
  //     "uint256 deadline" +
  //   ") returns (uint256[] amounts)"
  // ];

  // const ERC20_ABI = [
  //   "function approve(address spender, uint256 amount) external returns (bool)",
  //   "function decimals() view returns (uint8)",
  //   "function balanceOf(address) view returns (uint256)"
  // ];

  // const ROUTER = "0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e";   // DystopiaRouter

  


  // =========================== Swap 100 USD+ -> USDC on Dystopia ===========================

  // const router = await ethers.getContractAt(SOLIDLY_ROUTER_ABI, ROUTER);
  // const usdPlusAmountIn = ethers.utils.parseUnits("100", 6);
  // const route = [{ from: UsdPlusToken.address, to: POLYGON.usdc, stable: true }];
  // const deadline = Math.floor(Date.now() / 1000) + 600;

  // addProposalItem(UsdPlusToken, "mint", [timelock, usdPlusAmountIn]);
  // addProposalItem(UsdPlusToken, "approve", [ROUTER, usdPlusAmountIn]);
  // addProposalItem(router, "swapExactTokensForTokens", [
  //   usdPlusAmountIn,
  //   0,
  //   route,
  //   wal,
  //   deadline
  // ]);

  // =========================== LOGS ===========================

  let balance = await usdc.balanceOf(wal);
  console.log("usdc balance: ", ethers.utils.formatUnits(balance, 6));
  let NAV = await StrategyAaveV2.netAssetValue();
  console.log("NAV: ", ethers.utils.formatUnits(NAV, 6));


  // =========================== Upgrade USD+ ===========================

  const oldImplUsdPlus = "0x6AC0fFFF96cDD43ed1d52ade509C621D9600dA51";
  const newImplUsdPlus = "0x338D0cE61a5AC9EfBb2d6632743953FFF225444F";  // change it after deploy to the correct one

  addProposalItem(UsdPlusToken, 'upgradeTo', [newImplUsdPlus]);
  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImplUsdPlus]);

      
  // addProposalItem(UsdPlusToken, 'upgradeTo', [newImplUsdPlus]);
  // UsdPlusToken = await getContract('UsdPlusToken', 'polygon');

  // // =========================== Nuke USD+ ===========================

  // addProposalItem(UsdPlusToken, 'nukeSupply', [timelock]);
  // addProposalItem(UsdPlusToken, 'upgradeTo', [oldImplUsdPlus]);

  // ========================================================================

  await testProposal(addresses, values, abis);

  // =========================== LOGS AFTER PROPOSAL ===========================

  console.log("After proposal StrategyAaveV2 impl:", await getImplementationAddress(ethers.provider, StrategyAaveV2.address));
  
  NAV = await StrategyAaveV2.netAssetValue();
  console.log("NAV: ", ethers.utils.formatUnits(NAV, 6));
  balance = await usdc.balanceOf(wal);
  console.log("usdc balance: ", ethers.utils.formatUnits(balance, 6));

  // await createProposal(filename, addresses, values, abis);

  // ========================================================================

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData(methodName, params));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
