const {getContract, initWallet, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    execProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

const STRATEGY_ABI = require("@overnight-contracts/core/artifacts/contracts/Strategy.sol/Strategy.json").abi;
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");

async function main() {

    let exchange = await getContract('Exchange');
    let m2m = await getContract('Mark2Market');
    let pm = await getContract('PortfolioManager');
    let previousPm = await getContract('PortfolioManagerOld');
    let timelock = await getContract('OvnTimelockController');

    let wallet = await initWallet();

    let addresses = [];
    let values = [];
    let abis = [];

    function prepareExchange() {
        console.log('Prepare Exchange ...');

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xAb1C9e022Eb0AA2C946500d8C50727e5AA897Fbf']));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('changeAdminRoles', []));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('setInsurance', [COMMON.rewardWallet]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('setProfitRecipient', [COMMON.rewardWallet]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('setOracleLoss', [100, 100000]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('setCompensateLoss', [0, 100000]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('setPortfolioManager', [pm.address]));

        addresses.push(exchange.address);
        values.push(0);
        abis.push(exchange.interface.encodeFunctionData('revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]));

        console.log('Prepare Exchange done()');
    }

    function prepareM2M() {
        console.log('Prepare M2M ...');

        addresses.push(m2m.address);
        values.push(0);
        abis.push(m2m.interface.encodeFunctionData('upgradeTo', ['0xFCCE4611d810e93d823b351C53A01b9D27923a82']));

        addresses.push(m2m.address);
        values.push(0);
        abis.push(m2m.interface.encodeFunctionData('setPortfolioManager', [pm.address]));

        console.log('Prepare M2M done()');
    }

    async function prepareStrategies() {

        console.log('Prepare strategies...');

        let weights = await previousPm.getAllStrategyWeights();

        let newWeights = [];

        let strategies = [];
        for (const weight of weights) {
            console.log('Prepare strategy: ' + weight.strategy);
            weight.riskFactor = 0;

            let strategy = await new ethers.Contract(weight.strategy, STRATEGY_ABI, wallet);

            let nav = Number.parseInt(await fromAsset(await strategy.netAssetValue()));

            if (nav > 0 && Number.parseInt(weight.targetWeight.toString()) > 0) {
                console.log('Add strategy: ' + weight.strategy);
                addresses.push(pm.address);
                values.push(0);
                abis.push(pm.interface.encodeFunctionData('addStrategy', [weight.strategy]));


                addresses.push(strategy.address);
                values.push(0);
                abis.push(strategy.interface.encodeFunctionData('setPortfolioManager', [pm.address]));

                strategies.push(strategy);


                newWeights.push({
                    strategy: weight.strategy,
                    minWeight: weight.minWeight.toString(),
                    enabled: weight.enabled,
                    enabledReward: weight.enabledReward,
                    targetWeight: weight.targetWeight.toString(),
                    maxWeight: weight.maxWeight.toString(),
                    riskFactor: 0
                });
            } else {
                console.log('Ignore strategy: ' + weight.strategy);
            }
        }


        let cashStrategy = '0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76';

        addresses.push(pm.address);
        values.push(0);
        abis.push(pm.interface.encodeFunctionData('setCashStrategy', [cashStrategy]));

        addresses.push(pm.address);
        values.push(0);
        abis.push(pm.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]));

        addresses.push(pm.address);
        values.push(0);
        abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [newWeights]));

        addresses.push(pm.address);
        values.push(0);
        abis.push(pm.interface.encodeFunctionData('revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]));

        console.log('Prepare strategies ()');

        return strategies;
    }

    prepareExchange();
    prepareM2M();
    let strategies = await prepareStrategies();


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();

    // await testUsdPlus();

    // for (const strategy of strategies) {
    //
    //     expect(pm.address).to.equal(await strategy.portfolioManager(), `${strategy.address} `);
    // }

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

