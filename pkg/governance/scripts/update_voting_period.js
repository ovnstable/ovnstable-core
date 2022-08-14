const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE18} = require("@overnight-contracts/common/utils/decimals");
const {createProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {

    let governor = await getContract('OvnGovernor');



    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(governor.address);
    values.push(0);
    abis.push(governor.interface.encodeFunctionData('setVotingPeriod', [100]));

    await createProposal(addresses, values, abis);
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
