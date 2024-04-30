const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const {BASE, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = await initWallet();
    await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let alpha = await getContract('StrategyEtsAlpha', 'base');
    let rho = await getContract('StrategyEtsRho', 'base');
    let comp = await getContract('StrategyCompoundUsdbc', 'base');
    let aave = await getContract('StrategyAave', 'base');
    let pm = await getContract('PortfolioManager', 'base');
    let rm = await getContract('RoleManager', 'base');
    let ex = await getContract('Exchange', 'base');

    let newEtsImpl = "0xA4c3F5D26287Ecc178Db86729148B44Ba42284c1";
    let newCompImpl = "0xcc74AEf747Fb65E0B6f21aa91e81EE389CcFa7Ef";
    let timelock = "0x8ab9012d1bff1b62c2ad82ae0106593371e6b247";
    let newPMImpl = "0x53D763915f8a920C6e261091120954D48aE9353d";
    let oldPMImpl = "0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA";

    let alphaParams = {
        rebaseToken: '0xF575a5bF866b14ebb57E344Dbce4Bb44dCeDbfE4',
        hedgeExchanger: '0xe8CCF8F04dE2460313315abEAE9BE079813AE2FF',
        asset: BASE.usdc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };

    let rhoParams = {
        rebaseToken: '0x7ccAE37033Ef476477BB98693D536D87fdb8d2aF',
        hedgeExchanger: '0x0f67BceF1804612523D61a86A2FFC9849bBd00cA',
        asset: BASE.usdc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };

    let compParams = {
        usdc: BASE.usdc,
        usdbc: BASE.usdbc,
        comp: BASE.comp,
        cUsdbc: BASE.compoundUsdbc,
        compoundRewards: BASE.compoundRewards,
        rewardWallet: COMMON.rewardWallet,
        inchSwapper: BASE.inchSwapper,
    }

    let weights = [
        {
          strategy: '0xBaC3100BEEE79CA34B18fbcD0437bd382Ee5611B',
          minWeight: 0,
          targetWeight: 3000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        },
        {
          strategy: '0x0516F889E4F53D474B0F2EF0D8698AC03d51BdE5',
          minWeight: 0,
          targetWeight: 45000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        },
        {
          strategy: '0x78fA92E54C36586BCb0CB3a2dC37DF157Fd64708',
          minWeight: 0,
          targetWeight: 45000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        },
        {
          strategy: '0x687AC878bc93610366B705C385Cd0A0038493dbB',
          minWeight: 0,
          targetWeight: 7000,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        }
      ];

    // let lol = await pm.getAllStrategyWeights();
    // console.log(lol);
    // return;

    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
    addProposalItem(ex, 'setTokens', [BASE.usdPlus, BASE.usdc]);
    addProposalItem(pm, 'setAsset', [BASE.usdc]);
    addProposalItem(alpha, 'upgradeTo', [newEtsImpl]);
    addProposalItem(alpha, 'setParams', [alphaParams]);
    addProposalItem(rho, 'upgradeTo', [newEtsImpl]);
    addProposalItem(rho, 'setParams', [rhoParams]);
    addProposalItem(comp, 'upgradeTo', [newCompImpl]);
    addProposalItem(comp, 'setParams', [compParams]);
    addProposalItem(pm, 'addStrategy', [aave.address]);
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
    

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'base');
    // await testStrategy(filename, alpha, 'base');
    // await testStrategy(filename, rho, 'base');
    // await testStrategy(filename, comp, 'base');
    // await testStrategy(filename, aave, 'base');
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

