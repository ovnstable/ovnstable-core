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

  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  console.log("=".repeat(30));

  console.log("UsdPlusToken address:", UsdPlusToken.address);
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);

  // let balance = await UsdPlusToken.balanceOf(myAddress);
  // const formattedBalance = ethers.utils.formatUnits(balance, 18);
  // console.log("MikJack's Balance:", balance.toString(), `(≈ ${balance} USD+)`);

  // =============== Update Aave ==============
  console.log("=".repeat(30));

  console.log("#1");
  let oldImpl = '0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76';
  let newImpl = '0x0506583437a7eE8d8572004796A4D2a443a6ef2F';
  

  // =============== Get Aave Contract ==============
  console.log("=".repeat(30));

  console.log("#1");
  let StrategyAave = await getContract('StrategyAave', 'optimism');
  console.log("#2");
  console.log("StrategyAave address:", StrategyAave.address);
  console.log("#3");

  const nav = await StrategyAave.netAssetValue();

  console.log("#4");
  console.log("NAV of StrategyAave:", nav.toString(), `(≈ ${ethers.utils.formatUnits(nav, 6)} USDC)`);
  console.log("#5");


  // =============== Unstake Aave Usdc ===============
  console.log("=".repeat(30));
  console.log("=".repeat(5) + " UNSTAKE AAVE USDC " + "=".repeat(5));

  addProposalItem(StrategyAave, 'setStrategyParams', ['0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011', '0x63a4CA86118b8C1375565563D53D1826DFcf8801']);

  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.usdc, 0, devJun6, true]);

  // =============== Get New NAV and devJun6 USDC Balance ===============
  console.log("=".repeat(30));

  const newBalanceAave = await StrategyAave.netAssetValue();
  const formattedNewBalanceAave = ethers.utils.formatUnits(newBalanceAave, 6);

  console.log("NAV of StrategyAave:", newBalanceAave.toString(), `(≈ ${formattedNewBalanceAave} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  const devUsdcBalance = await usdc.balanceOf(devJun6);
  const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  console.log("#6");
  await testProposal(addresses, values, abis);
  // // await createProposal(filename, addresses, values, abis);
  console.log("#7");


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
