const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main(){

    let addresses = [];
    let values = [];
    let abis = [];
    let hedgeStrategy;

    let params = await getPrice();
    hedgeStrategy = await getContract('StrategyOpUsdc');
    await hedgeStrategy.grantRole(await hedgeStrategy.BALANCING_BOT_ROLE(), '0xCbcc0a48BBeAB7925DDf28a40C74376aDCd6526F', params);

//    hedgeStrategy = await getContract('StrategyUsdPlusWmatic');
//    addresses.push(hedgeStrategy.address);
//    values.push(0);
//    abis.push(hedgeStrategy.interface.encodeFunctionData('grantRole', [await hedgeStrategy.BALANCING_BOT_ROLE(), '0xCbcc0a48BBeAB7925DDf28a40C74376aDCd6526F']))
//
//    hedgeStrategy = await getContract('StrategyWmaticUsdc');
//    addresses.push(hedgeStrategy.address);
//    values.push(1);
//    abis.push(hedgeStrategy.interface.encodeFunctionData('grantRole', [await hedgeStrategy.BALANCING_BOT_ROLE(), '0xCbcc0a48BBeAB7925DDf28a40C74376aDCd6526F']))

    // hedgeStrategy = await getContract('StrategyUsdPlusWbnb');
    // addresses.push(hedgeStrategy.address);
    // values.push(0);
    // abis.push(hedgeStrategy.interface.encodeFunctionData('grantRole', [await hedgeStrategy.BALANCING_BOT_ROLE(), '0xCbcc0a48BBeAB7925DDf28a40C74376aDCd6526F']))

    // hedgeStrategy = await getContract('StrategyBusdWbnb');
    // addresses.push(hedgeStrategy.address);
    // values.push(1);
    // abis.push(hedgeStrategy.interface.encodeFunctionData('grantRole', [await hedgeStrategy.BALANCING_BOT_ROLE(), '0xCbcc0a48BBeAB7925DDf28a40C74376aDCd6526F']))

//    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

