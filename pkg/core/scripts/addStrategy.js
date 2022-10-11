const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xeF7913b8EBD17a725D684bf86DcAB1e9b1dB44bE']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x8ED7b474cFE7Ef362c32ffa2FB55aF7dC87D6048']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5']));

    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

