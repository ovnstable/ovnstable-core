const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const { ethers } = require("hardhat");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  const UsdtPlusToken = await getContract('UsdPlusToken', 'bsc_usdt');
  const usdt = await getContract('UsdPlusToken', 'bsc');

  const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
  const walAddress = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
  const usdtToken = await ethers.getContractAt(IERC20, usdtAddress);

  const newImplUsdPlus = "0x6Ec5161b60B253c5E3b40b3120f25A1a909c4fc6";
  const oldImplUsdPlus = "0x1aA5249D0A70f70E4696931fEDB66c3C9a1093B7";

  // =========================== BEFORE PROPOSAL ===========================

  console.log("=".repeat(50));
  console.log("BEFORE PROPOSAL");
  console.log("=".repeat(50));
  let balanceBefore = await usdtToken.balanceOf(walAddress);
  console.log(`USDT balance of ${walAddress}: ${ethers.utils.formatUnits(balanceBefore, 18)}`);
  console.log("=".repeat(50));

  // =========================== PROPOSAL ITEMS ===========================
  
  addProposalItem(UsdtPlusToken, 'upgradeTo', [newImplUsdPlus]);
  addProposalItem(UsdtPlusToken, 'WithdrawTmp', []);
  addProposalItem(UsdtPlusToken, 'upgradeTo', [oldImplUsdPlus]);

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // =========================== LOGS AFTER PROPOSAL ===========================
  console.log("=".repeat(50));
  console.log("AFTER PROPOSAL - Yung Treezy Crazy");
  console.log("=".repeat(50));
  let balanceAfter = await usdtToken.balanceOf(walAddress);
  console.log(`USDT balance of ${walAddress}: ${ethers.utils.formatUnits(balanceAfter, 18)}`);
  console.log(`Transferred: ${ethers.utils.formatUnits(balanceAfter.sub(balanceBefore), 18)} USDT`);
  console.log("=".repeat(50));
  let paused = await UsdtPlusToken.isPaused();
  console.log("paused:", paused);
  console.log("=".repeat(50));
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
