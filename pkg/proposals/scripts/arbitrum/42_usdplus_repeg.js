const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require('@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc')
const { strategySiloUsdcWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc')
const { strategySiloUsdcArb } = require('@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb')
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const { BASE, COMMON, ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

  let wallet = await initWallet();
  await transferETH(10, wallet.address);

  let addresses = [];
  let values = [];
  let abis = [];

  let alpha = await getContract('StrategySperAlpha', 'arbitrum');
  let gamma = await getContract('StrategySperGamma', 'arbitrum');
  let pm = await getContract('PortfolioManager', 'arbitrum');
  let rm = await getContract('RoleManager', 'arbitrum');
  let ex = await getContract('Exchange', 'arbitrum');

  let newSperImpl = "0xE71fb5dAD6770838E5f25BAD3F3aA6B1A00586C2";
  let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
  let siloimpl = "0x0FE8ab5Df905C0BEf5B2A985EcdDD106C5DB85b7";

  let alphaParams = {
    sper: '0x0Ce0262Dc2DF64991E3d5AF163175065c1000b86',
    asset: ARBITRUM.usdcCircle,
    underlyingAsset: ARBITRUM.usdcCircle,
    oracleAsset: ARBITRUM.oracleUsdc,
    oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
    inchSwapper: ARBITRUM.inchSwapper,
  };

  let gammaParams = {
    sper: '0x97cb73863a4a649Fc3c25c5263d5092c8a1E818C',
    asset: ARBITRUM.usdcCircle,
    underlyingAsset: ARBITRUM.usdcCircle,
    oracleAsset: ARBITRUM.oracleUsdc,
    oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
    inchSwapper: ARBITRUM.inchSwapper
  }

  let StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum')
  let StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum')
  let StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum')

  // let lol = await pm.getAllStrategyWeights();
  // console.log(lol);
  // return;

  addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
  addProposalItem(ex, 'setTokens', [ARBITRUM.usdPlus, ARBITRUM.usdcCircle]);
  addProposalItem(pm, 'setAsset', [ARBITRUM.usdcCircle]);
  addProposalItem(alpha, 'upgradeTo', [newSperImpl]);
  addProposalItem(alpha, 'setParams', [alphaParams]);
  addProposalItem(gamma, 'upgradeTo', [newSperImpl]);
  addProposalItem(gamma, 'setParams', [gammaParams]);

  // StrategySiloUsdc
  addProposalItem(StrategySiloUsdc, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdc, 'setParams', [await strategySiloUsdc()])
  addProposalItem(StrategySiloUsdcArb, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdcArb, 'setParams', [await strategySiloUsdcArb()])
  addProposalItem(StrategySiloUsdcWbtc, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdcWbtc, 'setParams', [await strategySiloUsdcWbtc()])


  addProposalItem(ex, 'setBuyFee', ['10', '100000']);
  addProposalItem(ex, 'setRedeemFee', ['10', '100000']);


  await testProposal(addresses, values, abis);
  // await testUsdPlus(filename, 'arbitrum');
  await testStrategy(filename, StrategySiloUsdc, 'arbitrum');
  await testStrategy(filename, StrategySiloUsdcArb, 'arbitrum');
  await testStrategy(filename, StrategySiloUsdcWbtc, 'arbitrum');
  // await createProposal(filename, addresses, values, abis);

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

