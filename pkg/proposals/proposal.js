const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
let {BSC} = require('@overnight-contracts/common/utils/assets');
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('StrategyPikaV4');

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0xAF016E2C070bd93de2035cf029934cb303db618C']));

    // await testProposal(addresses, values, abis);
    await createProposal('1_update_pika.js', addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

