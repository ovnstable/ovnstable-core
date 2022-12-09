const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');
/*
    let params = await getPrice();
    await pm.addStrategy('0xE8Deea3769f4dbC6046276C7d6076C33ff56442D', params);
    console.log("Strategy added");
*/
    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xBE8dE6350cF2090B1603e721B5BF1720F2aBD541']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xd2D69cF43974622Dc6546F85aDA7B58088B25DD7']));
/*
    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x0B5b9451b3b8C2Ba4e5CDF0ac6d9D05EE3ba9d30']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xA035AA89B56ab8A5b7865c936f70f02979ea5867']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x6A9d96f5eaCa97D61AD8f82C98591462Af9a7fc8']));
*/
    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

