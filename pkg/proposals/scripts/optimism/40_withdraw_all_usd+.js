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

  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // dev6
  const StrategyAave = await getContract('StrategyAave', 'optimism');
  const StrategyAaveDai = await getContract('StrategyAaveDai', 'optimism_dai');

  // =============== Unstake Aave Usdc ===============

  const timelock = '0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011';
  const usdRM = '0x63a4CA86118b8C1375565563D53D1826DFcf8801';
  const usdPM = '0xe1E36e93D31702019D38d2B0F6aB926f15008409';

  addProposalItem(StrategyAave, 'setStrategyParams', [timelock, usdRM]);
  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.usdc, 0, devJun6, true]);
  addProposalItem(StrategyAave, 'setStrategyParams', [usdPM, usdRM]);

  // =============== Unstake Aave DAI ===============

  const daiPM = '0x542BdE36670D066d9386bD7b174Cc81199B2e6A7';

  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyAaveDai, 'unstake', [OPTIMISM.dai, 0, devJun6, true]);
  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [daiPM]);

  // ============= Withdraw all USD+ =============
  const oldImpl = "0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250";
  const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA";
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'pause', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // =============== Get New NAV and devJun6 USDC && DAI Balance ===============
  console.log("=".repeat(30));
  
  const paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  const newBalanceAave = await StrategyAave.netAssetValue();
  const newBalanceAaveDai = await StrategyAaveDai.netAssetValue();

  const formattedNewBalanceAave = ethers.utils.formatUnits(newBalanceAave, 6);
  console.log("NAV of StrategyAave:", newBalanceAave.toString(), `(≈ ${formattedNewBalanceAave} USD+)`);

  const formattedNewBalanceAaveDai = ethers.utils.formatUnits(newBalanceAaveDai, 18);
  console.log("NAV of StrategyAaveDai:", newBalanceAaveDai.toString(), `(≈ ${formattedNewBalanceAaveDai} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  const devUsdcBalance = await usdc.balanceOf(devJun6);
  const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const dai = await ethers.getContractAt(IERC20, OPTIMISM.dai);
  const devDaiBalance = await dai.balanceOf(devJun6);
  const formattedDevDaiBalance = ethers.utils.formatUnits(devDaiBalance, 18);
  console.log("devJun6 DAI balance:", devDaiBalance.toString(), `(≈ ${formattedDevDaiBalance} DAI)`);

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
