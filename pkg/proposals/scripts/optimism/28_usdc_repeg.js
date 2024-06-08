const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const {OPTIMISM, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let aave = await getContract('StrategyAave', 'optimism');
    
    let pm = await getContract('PortfolioManager', 'optimism');
    let rm = await getContract('RoleManager', 'optimism');
    let ex = await getContract('Exchange', 'optimism');

    let newAaveImpl = ""; // insert
    let timelock = "0x8ab9012d1bff1b62c2ad82ae0106593371e6b247"; // check network
    let newPMImpl = "0x53D763915f8a920C6e261091120954D48aE9353d";
    let oldPMImpl = "0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA";

    let aaveParams = {
      usdc: OPTIMISM.usdc,
      aUsdc: OPTIMISM.aUsdc,
      aaveProvider: OPTIMISM.aaveProvider,
      rewardsController: OPTIMISM.rewardsController,
      uniswapV3Router: OPTIMISM.uniswapV3Router,
      op: OPTIMISM.op,
      poolFee: 500 // 0.05%
    }

    let weights = [
        {
          strategy: '0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76',
          minWeight: 0,
          targetWeight: 100000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        },
      ];

    // let lol = await pm.getAllStrategyWeights();
    // console.log(lol);
    // return;

    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
    addProposalItem(ex, 'setTokens', [OPTIMISM.usdPlus, OPTIMISM.usdc]);
    addProposalItem(pm, 'setAsset', [OPTIMISM.usdc]);
    addProposalItem(comp, 'upgradeTo', [newAaveImpl]);
    addProposalItem(comp, 'setParams', [aaveParams]);
    addProposalItem(pm, 'setStrategyWeights', [weights]);
    addProposalItem(pm, 'balance', []);
    addProposalItem(pm, 'upgradeTo', [newPMImpl]);
    addProposalItem(pm, 'setForceCashStrategy', [aave.address]);
    addProposalItem(pm, 'upgradeTo', [oldPMImpl]);

    weights[0].enabled = false;
    weights[1].enabled = false;
    weights[2].enabled = false;

    addProposalItem(pm, 'setStrategyWeights', [weights]);
    addProposalItem(pm, 'balance', []);
    

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    // await testStrategy(filename, alpha, 'base');
    // await testStrategy(filename, rho, 'base');
    // await testStrategy(filename, comp, 'base');
    // await testStrategy(filename, aave, 'base');
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

