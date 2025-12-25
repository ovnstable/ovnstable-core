const { getContract, getContractByAddress, showM2M, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  // === HOW TO RUN THIS SCRIPT ===
  // 1. check env and uncomment OP stuff
  // 2. cd pkg/core && hh node
  // 3. Deploy UsdPlusToken: cd pkg/core && hh deploy --tags UsdPlusToken --gov --impl --network localhost
  // 4. copy new impl address and paste to newImpl (probably similar to one there already)
  // 5. cd pkg/proposals && hh run scripts/optimism/36_withdraw_all_usd+.js --network localhost

  // ========================================================

  const StrategyAave = await getContract('StrategyAave', 'optimism');
  const StrategyAaveDai = await getContract('StrategyAaveDai', 'optimism_dai');

  const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // devjun6
  // ===================== OLD BALANCES =====================
  console.log("=".repeat(30));

  let blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);
  

  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  let paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);


  let BalanceAave = await StrategyAave.netAssetValue();
  let formattedBalanceAave = ethers.utils.formatUnits(BalanceAave, 6);
  console.log("NAV of StrategyAave:", BalanceAave.toString(), `(≈ ${formattedBalanceAave} USD+)`);


  let BalanceAaveDai = await StrategyAaveDai.netAssetValue();
  let formattedBalanceAaveDai = ethers.utils.formatUnits(BalanceAaveDai, 18);
  console.log("NAV of StrategyAaveDai:", BalanceAaveDai.toString(), `(≈ ${formattedBalanceAaveDai} USD+)`);


  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  let devUsdcBalance = await usdc.balanceOf(devJun6);
  let formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const dai = await ethers.getContractAt(IERC20, OPTIMISM.dai);
  let devDaiBalance = await dai.balanceOf(devJun6);
  let formattedDevDaiBalance = ethers.utils.formatUnits(devDaiBalance, 18);
  console.log("devJun6 DAI balance:", devDaiBalance.toString(), `(≈ ${formattedDevDaiBalance} DAI)`);

  console.log("=".repeat(30));

  // =========================== Unstake Aave Usdc ===========================

  const timelock = '0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011';  // same for both strategies, proxy
  const RM = '0x63a4CA86118b8C1375565563D53D1826DFcf8801';  // same for both strategies, proxy
  const usdPM = '0xe1E36e93D31702019D38d2B0F6aB926f15008409';  // proxy

  addProposalItem(StrategyAave, 'setStrategyParams', [timelock, RM]);
  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.usdc, 0, devJun6, true]);
  addProposalItem(StrategyAave, 'setStrategyParams', [usdPM, RM]);

  // =========================== Unstake Aave DAI ===========================

  const daiPM = '0x542BdE36670D066d9386bD7b174Cc81199B2e6A7';  // proxy

  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyAaveDai, 'unstake', [OPTIMISM.dai, 0, devJun6, true]);
  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [daiPM]);

  // =========================== Withdraw all USD+ ===========================

  const oldImpl = "0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250"; // impl
  const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA"; // impl
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));
  
  paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  BalanceAave = await StrategyAave.netAssetValue();
  formattedBalanceAave = ethers.utils.formatUnits(BalanceAave, 6);
  console.log("NAV of StrategyAave:", BalanceAave.toString(), `(≈ ${formattedBalanceAave} USD+)`);

  BalanceAaveDai = await StrategyAaveDai.netAssetValue();
  formattedBalanceAaveDai = ethers.utils.formatUnits(BalanceAaveDai, 18);
  console.log("NAV of StrategyAaveDai:", BalanceAaveDai.toString(), `(≈ ${formattedBalanceAaveDai} USD+)`);

  devUsdcBalance = await usdc.balanceOf(devJun6);
  formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  devDaiBalance = await dai.balanceOf(devJun6);
  formattedDevDaiBalance = ethers.utils.formatUnits(devDaiBalance, 18);
  console.log("devJun6 DAI balance:", devDaiBalance.toString(), `(≈ ${formattedDevDaiBalance} DAI)`);

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
