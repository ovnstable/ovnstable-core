const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, LINEA } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  // === HOW TO RUN THIS SCRIPT ===
  // 1. check env and uncomment linea stuff
  // 2. cd pkg/core && hh clean && hh node 
  // | it may be helpful to remove cache & local folders.
  // | If JSON-RPC refuses to response, change block number to more recent one.
  // 3. Deploy UsdPlusToken: cd pkg/core && hh deploy --tags UsdPlusToken --gov --impl --network localhost
  // 4. Add nukeSupply func to ABI:
  // ---
  // {
  //   "inputs": [],
  //   "name": "nukeSupply",
  //   "outputs": [],
  //   "stateMutability": "nonpayable",
  //   "type": "function"
  // },
  // ---
  // 5. copy new impl address and paste to newImpl (probably similar to one there already)
  // | Error: no matching function:
  // | simply get abi for setPortfolioManager and paste it where it belongs. This is internal project problem.
  // 6. cd pkg/proposals && hh run scripts/linea/18_withdraw_all_usd+.js --network localhost

  // ========================================================

  const StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
  const StrategyMendiUsdt = await getContract('StrategyMendiUsdt', 'linea_usdt');

  // const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be";

  const dev = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
  // ===================== OLD BALANCES =====================
  console.log("=".repeat(30));

  let blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);
  

  let UsdPlusToken = await getContract('UsdPlusToken', 'linea');
  let paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);


  let BalanceMendiUsdc = await StrategyMendiUsdc.netAssetValue();
  let formattedBalanceMendiUsdc = ethers.utils.formatUnits(BalanceMendiUsdc, 6);
  console.log("NAV of StrategyMendiUsdc:", BalanceMendiUsdc.toString(), `(≈ ${formattedBalanceMendiUsdc} USDC)`);


  let BalanceMendiUsdt = await StrategyMendiUsdt.netAssetValue();
  let formattedBalanceMendiUsdt = ethers.utils.formatUnits(BalanceMendiUsdt, 6);
  console.log("NAV of StrategyMendiUsdt:", BalanceMendiUsdt.toString(), `(≈ ${formattedBalanceMendiUsdt} USDT)`);


  const usdc = await ethers.getContractAt(IERC20, LINEA.usdc);
  let devUsdcBalance = await usdc.balanceOf(dev);
  let formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("dev USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const usdt = await ethers.getContractAt(IERC20, LINEA.usdt);
  let devUsdtBalance = await usdt.balanceOf(dev);
  let formattedDevUsdtBalance = ethers.utils.formatUnits(devUsdtBalance, 6);
  console.log("dev USDT balance:", devUsdtBalance.toString(), `(≈ ${formattedDevUsdtBalance} USDT)`);

  console.log("=".repeat(30));

  // =========================== Unstake Mendi Usdc ===========================

  const timelock = '0xB5f161eD93669eF8e566C435Fc591038c234C5EB';  // same for both strategies, proxy
  const usdPM = '0x27B12F3282F1d02682D7D1AD30E45e818B78f7B8';  // proxy

  addProposalItem(StrategyMendiUsdc, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyMendiUsdc, 'unstake', [LINEA.usdc, 15615384024, dev, false]);
  addProposalItem(StrategyMendiUsdc, 'setPortfolioManager', [usdPM]);

  // =========================== Unstake Mendi Usdt ===========================

  const usdtPM = '0x0932BB4c7e4bdD9cd717331b86d999046f8420E0';  // proxy

  addProposalItem(StrategyMendiUsdt, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyMendiUsdt, 'unstake', [LINEA.usdt, 18542085525, dev, false]);
  addProposalItem(StrategyMendiUsdt, 'setPortfolioManager', [usdtPM]);

  // =========================== Withdraw all USD+ ===========================

  const oldImpl = "0xe49579d531e657Fe3a9EA36Fb11764F81909047E"; // impl
  const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA"; // impl
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  UsdPlusToken = await getContract('UsdPlusToken', 'linea');

  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  UsdPlusToken = await getContract('UsdPlusToken', 'linea');

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));
  
  paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  BalanceMendiUsdc = await StrategyMendiUsdc.netAssetValue();
  formattedBalanceMendiUsdc = ethers.utils.formatUnits(BalanceMendiUsdc, 6);
  console.log("NAV of StrategyMendiUsdc:", BalanceMendiUsdc.toString(), `(≈ ${formattedBalanceMendiUsdc} USDC)`);

  BalanceMendiUsdt = await StrategyMendiUsdt.netAssetValue();
  formattedBalanceMendiUsdt = ethers.utils.formatUnits(BalanceMendiUsdt, 6);
  console.log("NAV of StrategyMendiUsdt:", BalanceMendiUsdt.toString(), `(≈ ${formattedBalanceMendiUsdt} USDT)`);

  devUsdcBalance = await usdc.balanceOf(dev);
  formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("dev USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  devUsdtBalance = await usdt.balanceOf(dev);
  formattedDevUsdtBalance = ethers.utils.formatUnits(devUsdtBalance, 6);
  console.log("dev USDT balance:", devUsdtBalance.toString(), `(≈ ${formattedDevUsdtBalance} USDT)`);

  console.log("=".repeat(30));

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
