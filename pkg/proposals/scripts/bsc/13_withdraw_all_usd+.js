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

  console.log("=".repeat(30));

  let UsdPlusToken = await getContract('UsdPlusToken', 'bsc');
  console.log("UsdPlusToken address:", UsdPlusToken.address);
  const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // dev6
  const StrategyVenusUsdc = await getContract('StrategyVenusUsdc', 'bsc');
  console.log("StrategyVenusUsdc address:", StrategyVenusUsdc.address);
  const StrategyVenusUsdt = await getContract('StrategyVenusUsdt', 'bsc_usdt');
  console.log("StrategyVenusUsdt address:", StrategyVenusUsdt.address);

  console.log("=".repeat(30));

  // =============== Unstake VENUS USDC ===============

  const oldImplVenusUsdc="0x996D44BF6A5f965BD2A93FBCFEf80Da2C7214cfD";
  const newImplVenusUsdc= await getContract('StrategyVenusUsdc', 'bsc').address;
  console.log("newImplVenusUsdc address:", newImplVenusUsdc);

  const timelock = '0x7f947D141FED32595916E150740a5e60d479E95F';
  const usdRM = '0x6bA1b8BbFF6Ec08544D9C4a7675D298cc8Fdb875';
  const usdPM = '0xff34aad62aeA14E1dA04E90967b36c188Ac9A770';

  console.log("#1");
  addProposalItem(StrategyVenusUsdc, 'upgradeTo', [newImplVenusUsdc]);
  console.log("#1");

  addProposalItem(StrategyVenusUsdc, 'setStrategyParams', [timelock, usdRM]);
  console.log("#2");
  addProposalItem(StrategyVenusUsdc, 'unstake', [BSC.usdc, 0, devJun6, true]);
  console.log("#3");
  addProposalItem(StrategyVenusUsdc, 'setStrategyParams', [usdPM, usdRM]);
  console.log("#4");
  addProposalItem(StrategyVenusUsdc, 'upgradeTo', [oldImplVenusUsdc]);
  console.log("#5");

  // =============== Unstake VENUS USDT ===============

  const oldImplVenusUsdt="0x4a3ebae2fb28aa96Cf570854715CBE37D9D9D475";
  const newImplVenusUsdt= await getContract('StrategyVenusUsdt', 'bsc_usdt').address;

  const usdtRM = '0x6bA1b8BbFF6Ec08544D9C4a7675D298cc8Fdb875';
  const usdtPM = '0x4788b55aBcA88610F1586A90017337399A62f8ae';

  addProposalItem(StrategyVenusUsdt, 'upgradeTo', [newImplVenusUsdt]);

  addProposalItem(StrategyVenusUsdt, 'setStrategyParams', [timelock, usdtRM]);
  addProposalItem(StrategyVenusUsdt, 'unstake', [BSC.usdt, 0, devJun6, true]);
  addProposalItem(StrategyVenusUsdt, 'setStrategyParams', [usdtPM, usdtRM]);

  addProposalItem(StrategyVenusUsdt, 'upgradeTo', [oldImplVenusUsdt]);

  // ============= Withdraw all USD+ =============
  const oldImpl = "0x6002054688d62275d80CC615f0F509d9b2FF520d";
  const newImpl = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5";
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  UsdPlusToken = await getContract('UsdPlusToken', 'bsc');

  addProposalItem(UsdPlusToken, 'nukeSupply', []);
  addProposalItem(UsdPlusToken, 'pause', []);
  addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  UsdPlusToken = await getContract('UsdPlusToken', 'bsc');

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

  // =============== Get New NAV and devJun6 USDC && DAI Balance ===============
  console.log("=".repeat(30));
  
  const paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  const newBalanceVenusUsdc = await StrategyVenusUsdc.netAssetValue();
  const newBalanceVenusUsdt = await StrategyVenusUsdt.netAssetValue();

  const formattedNewBalanceVenusUsdc = ethers.utils.formatUnits(newBalanceVenusUsdc, 6);
  console.log("NAV of StrategyVenusUsdc:", newBalanceVenusUsdc.toString(), `(≈ ${formattedNewBalanceVenusUsdc} USD+)`);

  const formattedNewBalanceVenusUsdt = ethers.utils.formatUnits(newBalanceVenusUsdt, 18);
  console.log("NAV of StrategyVenusUsdt:", newBalanceVenusUsdt.toString(), `(≈ ${formattedNewBalanceVenusUsdt} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, BSC.usdc);
  const devUsdcBalance = await usdc.balanceOf(devJun6);
  const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  const usdt = await ethers.getContractAt(IERC20, BSC.usdt);
  const devUsdtBalance = await usdt.balanceOf(devJun6);
  const formattedDevUsdtBalance = ethers.utils.formatUnits(devUsdtBalance, 18);
  console.log("devJun6 USDT balance:", devUsdtBalance.toString(), `(≈ ${formattedDevUsdtBalance} USDT)`);

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
