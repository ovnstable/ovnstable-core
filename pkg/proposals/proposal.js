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

    let exchange = await getContract('Exchange');
    let insurance = await getContract('InsuranceExchange');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xDB50c362044571AADead2e5F097f34287A894412']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setInsurance', [insurance.address]));

    // await testProposal(addresses, values, abis);
    await createProposal('2_set_insurance.js', addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

