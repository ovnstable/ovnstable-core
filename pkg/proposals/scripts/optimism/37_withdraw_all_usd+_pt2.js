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





  // ============= Withdraw all USD+ =============
  // console.log("=".repeat(20));

  // // New implementation address with nukeSupply function
  // let newImpl = "0x0506583437a7eE8d8572004796A4D2a443a6ef2F"; // dev5

  // addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  // addProposalItem(UsdPlusToken, 'nukeSupply', []);

  // console.log("=".repeat(20));
  // =============================================


  // =============================================
  console.log("=".repeat(30));

  let myAddress = "0xcD03360E2275c76296c948b89CE37cB99564903c";  // mikjacks address
  let devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // dev6

  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  console.log("=".repeat(30));

  console.log("UsdPlusToken address:", UsdPlusToken.address);
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);

  // let balance = await UsdPlusToken.balanceOf(myAddress);
  // const formattedBalance = ethers.utils.formatUnits(balance, 18);
  // console.log("MikJack's Balance:", balance.toString(), `(≈ ${balance} USD+)`);

  // =============== Get Aave Contract ==============
  console.log("=".repeat(30));

  console.log("#1");
  let StrategyAave = await getContract('StrategyAave', 'optimism');
  console.log("#2");
  console.log("StrategyAave address:", StrategyAave.address);
  console.log("#3");




  // const formattedBalanceAave = ethers.utils.formatUnits(balanceAave, 6);
  // console.log("NAV of StrategyAave:", balanceAave.toString(), `(≈ ${balanceAave} USD+)`);

  // =============== Get AUsdc Balance ==============
  // console.log("=".repeat(20));

  // const aUsdc = await ethers.getContractAt(IERC20, OPTIMISM.aUsdc);

  // const aUsdcBalance = await aUsdc.balanceOf(StrategyAave.address);
  // const formattedAUsdcBalance = ethers.utils.formatUnits(aUsdcBalance, 6);
  // console.log("AUsdc balance of StrategyAave:", aUsdcBalance.toString(), `(≈ ${formattedAUsdcBalance} AUsdc)`);

  // =============== Unstake Aave Usdc ===============
  console.log("=".repeat(30));
  console.log("=".repeat(5) + " UNSTAKE AAVE USDC " + "=".repeat(5));

  console.log("#4");
  addProposalItem(StrategyAave, 'unstakeFull', [OPTIMISM.aUsdc, devJun6]);
  console.log("#5");
  // =============== Get New NAV and devJun6 USDC Balance ===============
  console.log("=".repeat(30));

  // const newBalanceAave = await StrategyAave.netAssetValue();
  // console.log("#7");
  // const formattedNewBalanceAave = ethers.utils.formatUnits(newBalanceAave, 6);

  // console.log("NAV of StrategyAave:", newBalanceAave.toString(), `(≈ ${formattedNewBalanceAave} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  // const devUsdcBalance = await usdc.balanceOf(devJun6);
  // const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  // console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  console.log("#6");
  // await testProposal(addresses, values, abis);
  console.log("#7");

  // // await createProposal(filename, addresses, values, abis);

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData(methodName, params));
  }
  console.log("#8");

  const bal = await usdc.balanceOf(devJun6);
  console.log("#9");
   console.log('devJun6 USD+', ethers.utils.formatUnits(bal, 18));


  // async function testProposalAsPortfolioManager(addresses, values, abis) {
  //     const portfolioManager = await getContract('PortfolioManager', 'optimism');

  //     if (hre.network.name === 'localhost') {
  //         await hre.network.provider.send('hardhat_setBalance', [
  //             portfolioManager.address,
  //             '0x56BC75E2D63100000', // 10 ETH в wei
  //         ]);
  //     }

  //     const pmSigner = await impersonateAccount(portfolioManager.address);

  //     for (let i = 0; i < addresses.length; i++) {
  //         console.log(`PortfolioManager test tx index: [${i}] address: [${addresses[i]}]`);
  //         const tx = await (await pmSigner.sendTransaction({
  //             to: addresses[i],
  //             value: values[i],
  //             data: abis[i]
  //         })).wait();
  //         console.log('='.repeat(30));
  //         console.log('Tx mined:', tx.hash);
  //         console.log('='.repeat(30));
  //     }
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
