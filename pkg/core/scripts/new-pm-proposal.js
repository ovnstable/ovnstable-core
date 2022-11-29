const {toAsset, toE6} = require("@overnight-contracts/common/utils/decimals");

const {
    getContract,
    showM2M,
    getCoreAsset,
    transferETH,
    initWallet,
    execTimelock,
    convertWeights, getPrice, getStrategy
} = require("@overnight-contracts/common/utils/script-utils");
const {DEFAULT} = require("@overnight-contracts/common/utils/assets");
const {createProposal, execProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {

    let pm = await getContract('PortfolioManager');

    let wallet= await initWallet();

    let addresses = [];
    let values = [];
    let abis = [];

    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 53,
            "riskFactor": 1,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x0dD66c4f9a739042d313d2db48Bb62aadBcFEdc2",
            "name": "Gains DAI",
            "minWeight": 0,
            "riskFactor": 5,
            "targetWeight": 16.5,
            "maxWeight": 100,
             "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x03eBAAb0AF4C5450a1824B9158aC43349c61fdDa",
            "name": "ETS ALFA",
            "minWeight": 0,
            "targetWeight": 3,
            "riskFactor": 30,
            "maxWeight": 100,
             "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x3114bfDce69a13d2258BD273D231386A074cEC48",
            "name": "ETS BETA",
            "minWeight": 0,
            "targetWeight": 11,
            "riskFactor": 5,
            "maxWeight": 100,
             "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x0B5b9451b3b8C2Ba4e5CDF0ac6d9D05EE3ba9d30",
            "name": "ETS DELTA",
            "minWeight": 0,
            "targetWeight": 11,
            "riskFactor": 5,
            "maxWeight": 100,
             "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xA035AA89B56ab8A5b7865c936f70f02979ea5867",
            "name": "ETS GAMMA",
            "minWeight": 0,
            "targetWeight": 3,
            "riskFactor": 30,
            "maxWeight": 100,
             "enabled": false,
            "enabledReward": false
        }
    ]




    for (let i = 0; i < weights.length; i++) {

        let contract = await getStrategy(weights[i].strategy);

        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData('setPortfolioManager', [pm.address]));
    }


    let m2m = await getContract('Mark2Market');
    let exchange = await getContract('Exchange', 'localhost');
    let usdPlusToken = await getContract('UsdPlusToken');

    addresses.push(m2m.address);
    values.push(0);
    abis.push(m2m.interface.encodeFunctionData('setPortfolioManager', [pm.address]));

    addresses.push(m2m.address);
    values.push(0);
    abis.push(m2m.interface.encodeFunctionData('upgradeTo', ['0x21ED8B6bfA3091D6147e5D115855688df201Ca52']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setPortfolioManager', [pm.address]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0x5f98069b534d68eB3da0E8128c998A27618E0eDc']));


    let insurance = await getContract('InsuranceExchange', 'polygon_ins');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setInsurance', [insurance.address]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setProfitRecipient', [DEFAULT.rewardWallet]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [await exchange.PORTFOLIO_AGENT_ROLE(), wallet.address]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [await exchange.PORTFOLIO_AGENT_ROLE(), '0x0bE3f37201699F00C21dCba18861ed4F60288E1D']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [await exchange.PORTFOLIO_AGENT_ROLE(), '0xe497285e466227F4E8648209E34B465dAA1F90a0']));


    await transferETH(10, wallet.address);
    let proposalId =  await createProposal(addresses, values, abis);
    await execProposal(proposalId);

    let price = await getPrice();

    await showM2M();

    weights = await convertWeights(weights);
    await (await pm.setStrategyWeights(weights, price)).wait();
    await (await pm.balance(price)).wait();

    await showM2M();

    let asset = await getCoreAsset();

    await (await asset.approve(exchange.address, toAsset(1), price)).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, toAsset(1), price)).wait();
    console.log('Exchange.buy done');

    await showM2M();

    await (await usdPlusToken.approve(exchange.address, toE6(1))).wait();
    console.log('UsdPlus approve done');
    await (await exchange.redeem(asset.address, toE6(1))).wait();
    console.log('Exchange.redeem done');

    await showM2M();


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

