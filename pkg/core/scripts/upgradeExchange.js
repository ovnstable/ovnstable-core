const {getContract, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {showPoolOperations} = require("@overnight-contracts/common/utils/payoutListener");

async function main() {


    let addresses = [];
    let values = [];
    let abis = [];


    let exchange = await getContract('Exchange', 'optimism');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xfF66c6A4B3910b62bBCF4Cfde61562ef3E96a5eD']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setPayoutListener', ['0xf59C9A5110852a82434E02d1A43169b5fD9897Be']));


    let exchangeDai = await getContract('Exchange', 'optimism_dai');

    addresses.push(exchangeDai.address);
    values.push(0);
    abis.push(exchangeDai.interface.encodeFunctionData('upgradeTo', ['0xfF66c6A4B3910b62bBCF4Cfde61562ef3E96a5eD']));

    addresses.push(exchangeDai.address);
    values.push(0);
    abis.push(exchangeDai.interface.encodeFunctionData('setPayoutListener', ['0xf59C9A5110852a82434E02d1A43169b5fD9897Be']));

    // await testProposal(addresses, values, abis);

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

