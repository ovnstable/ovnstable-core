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

  // let wallet = await initWallet();
  // await transferETH(10, wallet.address);

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
  let siloimpl = "0x69221D91989F764fcA847F2c0cfA5fa5E0Eba9bf";
  let newPMImpl = "0xbd7fD4B89239661edE7dEdF5Eb69BF0cC79AE48b";
  let oldPMImpl = "0x3bb538455820a077424FcfeF794AB8ee8B15be6d";

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
  let comp = await getContract('StrategyCompoundUsdc', 'arbitrum');
  let aave = await getContract('StrategyAaveUsdc', 'arbitrum');

  let weights = [
    {
      strategy: '0xF4e58b63FD822E6543245128a42fE8Ad22db161d',
      minWeight: 0,
      targetWeight: 26160,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: true,
      enabledReward: true
    },
    {
      strategy: '0x135478A4729901651f106fD0Dc112b0FBdD670cf',
      minWeight: 0,
      targetWeight: 16790,
      maxWeight: 100000,
      riskFactor: 20000,
      enabled: false,
      enabledReward: false
    },
    {
      strategy: '0x95bfd5F980aCc358Ecaafa84Ae61571750F46b1E',
      minWeight: 0,
      targetWeight: 19000,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: true,
      enabledReward: true
    },
    {
      strategy: '0x0f0d417bd98dC246b581d23CAE83584bd4096Cd6',
      minWeight: 0,
      targetWeight: 19000,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: true,
      enabledReward: true
    },
    {
      strategy: '0x413C0f086A9A571E000D8d97053568368777907F',
      minWeight: 0,
      targetWeight: 17550,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: false,
      enabledReward: false
    },
    {
      strategy: '0x5c87238A7C3A98Ff4210Bc192dEB9e567cA6dFE1',
      minWeight: 0,
      targetWeight: 750,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: true,
      enabledReward: true
    },
    {
      strategy: '0x32DabdE50e764af7d13E3dF6b7D3cf00a39f83Af',
      minWeight: 0,
      targetWeight: 750,
      maxWeight: 100000,
      riskFactor: 0,
      enabled: true,
      enabledReward: false
    }
  ];

  addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
  addProposalItem(ex, 'setTokens', [ARBITRUM.usdPlus, ARBITRUM.usdcCircle]);
  addProposalItem(pm, 'setAsset', [ARBITRUM.usdcCircle]);
  addProposalItem(alpha, 'upgradeTo', [newSperImpl]);
  addProposalItem(alpha, 'setParams', [alphaParams]);
  addProposalItem(gamma, 'upgradeTo', [newSperImpl]);
  addProposalItem(gamma, 'setParams', [gammaParams]);

  addProposalItem(StrategySiloUsdc, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdc, 'setParams', [await strategySiloUsdc()])
  addProposalItem(StrategySiloUsdcArb, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdcArb, 'setParams', [await strategySiloUsdcArb()])
  addProposalItem(StrategySiloUsdcWbtc, 'upgradeTo', [siloimpl])
  addProposalItem(StrategySiloUsdcWbtc, 'setParams', [await strategySiloUsdcWbtc()])


  addProposalItem(ex, 'setBuyFee', ['10', '100000']);
  addProposalItem(ex, 'setRedeemFee', ['10', '100000']);

  addProposalItem(pm, 'addStrategy', [aave.address]);
  addProposalItem(pm, 'addStrategy', [comp.address]);
  addProposalItem(pm, 'setStrategyWeights', [weights]);
  addProposalItem(pm, 'balance', []);
  addProposalItem(pm, 'upgradeTo', [newPMImpl]);
  addProposalItem(pm, 'setForceCashStrategy', [aave.address]);
  addProposalItem(pm, 'upgradeTo', [oldPMImpl]);


  weights[0].enabled = false;
  weights[2].enabled = false;
  weights[3].enabled = false;

  addProposalItem(pm, 'setStrategyWeights', [weights]);
  addProposalItem(pm, 'balance', []);


  // await testProposal(addresses, values, abis);
  // await testUsdPlus(filename, 'arbitrum');

  let lol = await pm.getAllStrategyWeights();
  console.log(lol.map((el) => {
    return {
      strategy: el.strategy,
      minWeight: el.minWeight.toNumber(),
      targetWeight: el.targetWeight.toNumber(),
      maxWeight: el.maxWeight.toNumber(),
      riskFactor: el.riskFactor.toNumber(),
      enabled: el.enabled,
      enabledReward: el.enabledReward,
    }
  }));
  // await testStrategy(filename, StrategySiloUsdc, 'arbitrum');
  // await testStrategy(filename, StrategySiloUsdcArb, 'arbitrum');
  // await testStrategy(filename, StrategySiloUsdcWbtc, 'arbitrum');
  await createProposal(filename, addresses, values, abis);

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

