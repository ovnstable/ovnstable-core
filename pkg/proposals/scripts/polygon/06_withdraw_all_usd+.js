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

  let UsdPlusToken = await getContract('UsdPlusToken', 'polygon');
  console.log("UsdPlusToken address: ", UsdPlusToken.address);
  const usdc = await ethers.getContractAt(IERC20, POLYGON.usdc);
  const wpol = await ethers.getContractAt(IERC20, "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");

  // ====================================================================
  const StrategyAaveV2 = await getContract('StrategyAaveV2', 'polygon');

  const oldImplAaveV2 = "0xc991047d9bd4513274b74DBe82b94cc22252CB30";
  const newImplAaveV2 = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5";

  console.log("Current StrategyAaveV2 impl:", await getImplementationAddress(ethers.provider, StrategyAaveV2.address));

  // =========================== Unstake Aave Usdc ===========================

  addProposalItem(StrategyAaveV2, 'upgradeTo', [newImplAaveV2]);
  addProposalItem(StrategyAaveV2, 'unstakeFull', []);
  addProposalItem(StrategyAaveV2, 'upgradeTo', [oldImplAaveV2]);

  // ==================== LOGS BEFORE PROPOSAL ====================
  
  const pair1 = "0x421a018cC5839c4C0300AfB21C725776dc389B1a";
  const pair2 = "0x6c51df2275af37c407148e913B5396896E7E8E9e";
  const pair3 = "0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170";
  
  console.log("\n========== BEFORE PROPOSAL ==========");
  
  let NAV = await StrategyAaveV2.netAssetValue();
  console.log("Strategy NAV:              ", ethers.utils.formatUnits(NAV, 6));

  let walUsdcBalance = await usdc.balanceOf(wal);
  console.log("Wallet USDC balance:       ", ethers.utils.formatUnits(walUsdcBalance, 6));
  
  let walWpolBalance = await wpol.balanceOf(wal);
  console.log("Wallet WPOL balance:       ", ethers.utils.formatUnits(walWpolBalance, 18));
  
  let usdPlusBalanceContract = await UsdPlusToken.balanceOf(UsdPlusToken.address);
  console.log("USD+ contract balance:     ", ethers.utils.formatUnits(usdPlusBalanceContract, 6));

  console.log("");
  
  let pair1UsdPlusBalance = await UsdPlusToken.balanceOf(pair1);
  console.log("Pool 1 USD+ balance:       ", ethers.utils.formatUnits(pair1UsdPlusBalance, 6));
  let pair1UsdcBalance = await usdc.balanceOf(pair1);
  console.log("Pool 1 USDC balance:       ", ethers.utils.formatUnits(pair1UsdcBalance, 6));

  console.log("");
  
  let pair2UsdPlusBalance = await UsdPlusToken.balanceOf(pair2);
  console.log("Pool 2 USD+ balance:       ", ethers.utils.formatUnits(pair2UsdPlusBalance, 6));
  let pair2UsdcBalance = await usdc.balanceOf(pair2);
  console.log("Pool 2 USDC balance:       ", ethers.utils.formatUnits(pair2UsdcBalance, 6));

  console.log("");
  
  let pair3UsdPlusBalance = await UsdPlusToken.balanceOf(pair3);
  console.log("Pool 3 USD+ balance:       ", ethers.utils.formatUnits(pair3UsdPlusBalance, 6));
  let pair3WpolBalance = await wpol.balanceOf(pair3);
  console.log("Pool 3 WPOL balance:       ", ethers.utils.formatUnits(pair3WpolBalance, 18));
  
  console.log("=========================================\n");

  // =========================== Upgrade USD+ ===========================

  // const oldImplUsdPlus = "0x6AC0fFFF96cDD43ed1d52ade509C621D9600dA51";
  const tmpImplUsdPlus = "0x5f7823fa9Fb17934be132a1F5a2668302bD2dd8e";  // change it after deploy to the correct one
  const finalImplUsdPlus = "0x338D0cE61a5AC9EfBb2d6632743953FFF225444F";

  addProposalItem(UsdPlusToken, 'upgradeTo', [tmpImplUsdPlus]);
  addProposalItem(UsdPlusToken, 'swapNuke', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [finalImplUsdPlus]);

  await testProposal(addresses, values, abis);

  // ==================== LOGS AFTER PROPOSAL ====================
  
  console.log("\n========== AFTER PROPOSAL ==========");
  
  console.log("StrategyAaveV2 impl:       ", await getImplementationAddress(ethers.provider, StrategyAaveV2.address));
  
  let NAVAfter = await StrategyAaveV2.netAssetValue();
  console.log("Strategy NAV:              ", ethers.utils.formatUnits(NAVAfter, 6));
  
  let walUsdcBalanceAfter = await usdc.balanceOf(wal);
  console.log("Wallet USDC balance:       ", ethers.utils.formatUnits(walUsdcBalanceAfter, 6));
  
  let walWpolBalanceAfter = await wpol.balanceOf(wal);
  console.log("Wallet WPOL balance:       ", ethers.utils.formatUnits(walWpolBalanceAfter, 18));
  
  let usdPlusBalanceContractAfter = await UsdPlusToken.balanceOf(UsdPlusToken.address);
  console.log("USD+ contract balance:     ", ethers.utils.formatUnits(usdPlusBalanceContractAfter, 6));
  
  let isPausedAfter = await UsdPlusToken.isPaused();
  console.log("USD+ contract isPaused:    ", isPausedAfter);

  console.log("");
  
  let pair1UsdPlusBalanceAfter = await UsdPlusToken.balanceOf(pair1);
  console.log("Pool 1 USD+ balance:       ", ethers.utils.formatUnits(pair1UsdPlusBalanceAfter, 6));
  let pair1UsdcBalanceAfter = await usdc.balanceOf(pair1);
  console.log("Pool 1 USDC balance:       ", ethers.utils.formatUnits(pair1UsdcBalanceAfter, 6));
  
  console.log("");
  
  let pair2UsdPlusBalanceAfter = await UsdPlusToken.balanceOf(pair2);
  console.log("Pool 2 USD+ balance:       ", ethers.utils.formatUnits(pair2UsdPlusBalanceAfter, 6));
  let pair2UsdcBalanceAfter = await usdc.balanceOf(pair2);
  console.log("Pool 2 USDC balance:       ", ethers.utils.formatUnits(pair2UsdcBalanceAfter, 6));

  console.log("");
  
  let pair3UsdPlusBalanceAfter = await UsdPlusToken.balanceOf(pair3);
  console.log("Pool 3 USD+ balance:       ", ethers.utils.formatUnits(pair3UsdPlusBalanceAfter, 6));
  let pair3WpolBalanceAfter = await wpol.balanceOf(pair3);
  console.log("Pool 3 WPOL balance:       ", ethers.utils.formatUnits(pair3WpolBalanceAfter, 18));
  
  console.log("=========================================");
  
  console.log("\n========== CHANGES ==========");
  console.log("Strategy NAV change:           ", ethers.utils.formatUnits(NAVAfter.sub(NAV), 6));
  console.log("Wallet USDC change:            ", ethers.utils.formatUnits(walUsdcBalanceAfter.sub(walUsdcBalance), 6));
  console.log("Wallet WPOL change:            ", ethers.utils.formatUnits(walWpolBalanceAfter.sub(walWpolBalance), 18));
  console.log("USD+ contract change:          ", ethers.utils.formatUnits(usdPlusBalanceContractAfter.sub(usdPlusBalanceContract), 6));
  console.log("USD+ isPaused changed:         ", "→", isPausedAfter);
  console.log("");
  console.log("Pool 1 USD+ change:            ", ethers.utils.formatUnits(pair1UsdPlusBalanceAfter.sub(pair1UsdPlusBalance), 6));
  console.log("Pool 1 USDC change:            ", ethers.utils.formatUnits(pair1UsdcBalanceAfter.sub(pair1UsdcBalance), 6));
  console.log("");
  console.log("Pool 2 USD+ change:            ", ethers.utils.formatUnits(pair2UsdPlusBalanceAfter.sub(pair2UsdPlusBalance), 6));
  console.log("Pool 2 USDC change:            ", ethers.utils.formatUnits(pair2UsdcBalanceAfter.sub(pair2UsdcBalance), 6));
  console.log("");
  console.log("Pool 3 USD+ change:            ", ethers.utils.formatUnits(pair3UsdPlusBalanceAfter.sub(pair3UsdPlusBalance), 6));
  console.log("Pool 3 WPOL change:            ", ethers.utils.formatUnits(pair3WpolBalanceAfter.sub(pair3WpolBalance), 18));
  console.log("====================================\n");
  
  // ==============================================================

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