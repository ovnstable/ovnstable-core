const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
let {BSC} = require('@overnight-contracts/common/utils/assets');
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let wallet = await initWallet();

    let strategy = await getContract('StrategyEtsAlpha');

    let hedgeExchangerAlpha = "0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D";
    let strategyAlpha = "0x2EBe7e883DBD37D8Bd228e1883De392031068698";
    let strategyEtsAlpha = "0x3140D9baa96e0E680747dBce4666D75F497d6F53";

    addresses.push(hedgeExchangerAlpha);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet.address]));

    addresses.push(strategyAlpha);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet.address]));

    addresses.push(strategyEtsAlpha);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, wallet.address]));

    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

