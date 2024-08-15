const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('StrategyPikaV4', 'optimism');


    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x55e8321515bC900A179C38a668a113Da09c7E48D']));


    console.log(`NAV: ${fromE6(await strategy.netAssetValue())}`)
    await testProposal(addresses, values, abis);
    await testStrategy(filename, strategy, 'optimism');
    console.log(`NAV: ${fromE6(await strategy.netAssetValue())}`)

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

