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
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x53fF0d71645D106E058d83404ccD975924c26dCB']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x621409Ad21B486eA8688c5608abc904Cd8DB8e9b']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xFe7f3FEa8972313F859194EE00158798be3ED108']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0xed197258b388AfaAD5f0D46B608B583E395ede92']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x6A9d96f5eaCa97D61AD8f82C98591462Af9a7fc8']));

    await createProposal(addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

