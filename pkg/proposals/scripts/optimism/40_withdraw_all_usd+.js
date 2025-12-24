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



  console.log("=".repeat(30));
  let devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // dev6
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);


  // =============== Get Aave Contract ==============
  console.log("=".repeat(30));
  let StrategyAave = await getContract('StrategyAave', 'optimism');
  let StrategyAaveDai = await getContract('StrategyAaveDai', 'optimism_dai');

  console.log("StrategyAave address:", StrategyAave.address);

  const oldDaiImpl = '0x2E80122B1A095C25Aa5717B2bE8DC1eaFE9C8850';
  const newDaiImpl = '0x0EAD597c9f70D68b6d7486BAF95f7109CCe9f0B6';


  // =============== Get USDC Contract ==============
  console.log("StrategyAave address:", StrategyAave.address);
  const usdcNav = await StrategyAave.netAssetValue();
  console.log("NAV of StrategyAave:", usdcNav.toString(), `(≈ ${ethers.utils.formatUnits(usdcNav, 6)} USDC)`);

  console.log("=".repeat(30));

  // =============== Get DAI Contract ==============
  console.log("StrategyAaveDai address:", StrategyAaveDai.address);
  const daiNav = await StrategyAaveDai.netAssetValue();
  console.log("NAV of StrategyAaveDai:", daiNav.toString(), `(≈ ${ethers.utils.formatUnits(daiNav, 18)} DAI)`);


  // =============== Show ABI Functions ==============
  console.log(Object.keys(StrategyAave.interface.functions));
  console.log(Object.keys(StrategyAaveDai.interface.functions));

  // =============== Unstake Aave Usdc ===============

  const portfolioManagerAddress = '0xe1E36e93D31702019D38d2B0F6aB926f15008409'
  const roleManagerAddress = '0x63a4CA86118b8C1375565563D53D1826DFcf8801';

  console.log("=".repeat(30));
  console.log("=".repeat(5) + " UNSTAKE AAVE USDC " + "=".repeat(5));
  addProposalItem(StrategyAave, 'setStrategyParams', ['0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011', roleManagerAddress]);
  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.usdc, 0, devJun6, true]);

  console.log("Portfolio Manager address:", portfolioManagerAddress);
  addProposalItem(StrategyAave, 'setStrategyParams', [portfolioManagerAddress, roleManagerAddress]);

  // =============== Unstake Aave DAI ===============
  console.log("=".repeat(30));
  console.log("=".repeat(5) + " UNSTAKE AAVE DAI " + "=".repeat(5));

  console.log("#1");
  addProposalItem(StrategyAaveDai, 'upgradeTo', [newDaiImpl]);
  console.log("#2");
  addProposalItem(StrategyAaveDai, 'setStrategyParams', ['0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011', roleManagerAddress]);
  console.log("#3");
  addProposalItem(StrategyAaveDai, 'unstake', [OPTIMISM.dai, 0, devJun6, true]);
  console.log("#4");
  addProposalItem(StrategyAaveDai, 'setStrategyParams', [portfolioManagerAddress, roleManagerAddress]);
  console.log("#5");
  addProposalItem(StrategyAaveDai, 'upgradeTo', [oldDaiImpl]);
  console.log("#6");




  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // =============== Get New NAV and devJun6 USDC && DAI Balance ===============
  console.log("=".repeat(30));
  const newBalanceAave = await StrategyAave.netAssetValue();
  const newBalanceAaveDai = await StrategyAaveDai.netAssetValue();

  const formattedNewBalanceAave = ethers.utils.formatUnits(newBalanceAave, 6);
  console.log("NAV of StrategyAave:", newBalanceAave.toString(), `(≈ ${formattedNewBalanceAave} USD+)`);

  const formattedNewBalanceAaveDai = ethers.utils.formatUnits(newBalanceAaveDai, 6);
  console.log("NAV of StrategyAaveDai:", newBalanceAaveDai.toString(), `(≈ ${formattedNewBalanceAaveDai} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  const devUsdcBalance = await usdc.balanceOf(devJun6);
  const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const dai = await ethers.getContractAt(IERC20, OPTIMISM.dai);
  const devDaiBalance = await dai.balanceOf(devJun6);
  const formattedDevDaiBalance = ethers.utils.formatUnits(devDaiBalance, 6);
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
