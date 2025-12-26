const { getContract, getContractByAddress, showM2M, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, BSC } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  // === HOW TO RUN THIS SCRIPT ===
  // 1. check env and uncomment bsc stuff
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
  // 6. cd pkg/proposals && hh run scripts/bsc/14_withdraw_all_usd+.js --network localhost

  // ========================================================

  const StrategyVenusUsdc = await getContract('StrategyVenusUsdc', 'bsc');
  const StrategyVenusUsdt = await getContract('StrategyVenusUsdt', 'bsc_usdt');

  // const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // devjun6

  const dev = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
  // ===================== OLD BALANCES =====================
  console.log("=".repeat(30));

  let blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);
  

  let UsdPlusToken = await getContract('UsdPlusToken', 'bsc');
  let paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);


  let BalanceVenusUsdc = await StrategyVenusUsdc.netAssetValue();
  let formattedBalanceVenusUsdc = ethers.utils.formatUnits(BalanceVenusUsdc, 18);
  console.log("NAV of StrategyVenusUsdc:", BalanceVenusUsdc.toString(), `(≈ ${formattedBalanceVenusUsdc} USDC)`);


  let BalanceVenusUsdt = await StrategyVenusUsdt.netAssetValue();
  let formattedBalanceVenusUsdt = ethers.utils.formatUnits(BalanceVenusUsdt, 18);
  console.log("NAV of StrategyVenusUsdt:", BalanceVenusUsdt.toString(), `(≈ ${formattedBalanceVenusUsdt} USDT)`);


  const usdc = await ethers.getContractAt(IERC20, BSC.usdc);
  let devUsdcBalance = await usdc.balanceOf(dev);
  let formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 18);
  console.log("dev USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const usdt = await ethers.getContractAt(IERC20, BSC.usdt);
  let devUsdtBalance = await usdt.balanceOf(dev);
  let formattedDevUsdtBalance = ethers.utils.formatUnits(devUsdtBalance, 18);
  console.log("dev USDT balance:", devUsdtBalance.toString(), `(≈ ${formattedDevUsdtBalance} USDT)`);

  console.log("=".repeat(30));

  // // =========================== Unstake Venus Usdc ===========================

  const timelock = '0x7f947D141FED32595916E150740a5e60d479E95F';  // same for both strategies, proxy
  const usdPM = '0xff34aad62aeA14E1dA04E90967b36c188Ac9A770';  // proxy

  addProposalItem(StrategyVenusUsdc, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyVenusUsdc, 'unstake', [BSC.usdc, 0, dev, true]);
  addProposalItem(StrategyVenusUsdc, 'setPortfolioManager', [usdPM]);

  // =========================== Unstake Venus Usdt ===========================

  const usdtPM = '0x4788b55aBcA88610F1586A90017337399A62f8ae';  // proxy

  addProposalItem(StrategyVenusUsdt, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyVenusUsdt, 'unstake', [BSC.usdt, 0, dev, true]);
  addProposalItem(StrategyVenusUsdt, 'setPortfolioManager', [usdtPM]);

  // // =========================== Withdraw all USD+ ===========================

  const oldImpl = "0x6002054688d62275d80CC615f0F509d9b2FF520d"; // impl
  const newImpl = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5"; // impl
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  UsdPlusToken = await getContract('UsdPlusToken', 'bsc');

  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  UsdPlusToken = await getContract('UsdPlusToken', 'bsc');

  await testProposal(addresses, values, abis);
  // // await createProposal(filename, addresses, values, abis);

  // // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));
  
  paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  BalanceVenusUsdc = await StrategyVenusUsdc.netAssetValue();
  formattedBalanceVenusUsdc = ethers.utils.formatUnits(BalanceVenusUsdc, 18);
  console.log("NAV of StrategyVenusUsdc:", BalanceVenusUsdc.toString(), `(≈ ${formattedBalanceVenusUsdc} USDC)`);

  BalanceVenusUsdt = await StrategyVenusUsdt.netAssetValue();
  formattedBalanceVenusUsdt = ethers.utils.formatUnits(BalanceVenusUsdt, 18);
  console.log("NAV of StrategyVenusUsdt:", BalanceVenusUsdt.toString(), `(≈ ${formattedBalanceVenusUsdt} USDT)`);

  devUsdcBalance = await usdc.balanceOf(dev);
  formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 18);
  console.log("dev USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  devUsdtBalance = await usdt.balanceOf(dev);
  formattedDevUsdtBalance = ethers.utils.formatUnits(devUsdtBalance, 18);
  console.log("dev USDT balance:", devUsdtBalance.toString(), `(≈ ${formattedDevUsdtBalance} USDT)`);

  console.log("=".repeat(30));

  // // ========================================================================


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
