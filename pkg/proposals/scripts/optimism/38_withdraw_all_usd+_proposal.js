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

  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.aUsdc, 0, devJun6, true]);

  // =============== Get New NAV and devJun6 USDC Balance ===============
  console.log("=".repeat(30));

  const newBalanceAave = await StrategyAave.netAssetValue();
  const formattedNewBalanceAave = ethers.utils.formatUnits(newBalanceAave, 6);

  console.log("NAV of StrategyAave:", newBalanceAave.toString(), `(≈ ${formattedNewBalanceAave} USD+)`);

  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  const devUsdcBalance = await usdc.balanceOf(devJun6);
  const formattedDevUsdcBalance = ethers.utils.formatUnits(devUsdcBalance, 6);
  console.log("devJun6 USDC balance:", devUsdcBalance.toString(), `(≈ ${formattedDevUsdcBalance} USDC)`);

  await testProposal(addresses, values, abis);
  // // await createProposal(filename, addresses, values, abis);

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData(methodName, params));
  }

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
