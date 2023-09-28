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

    let pm = await getContract('PortfolioManager');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x4957653E0fdd3EA8a76577B81E12E89dD3e56F8E']));

    // await testProposal(addresses, values, abis);
    await createProposal('3_add_alpha_smm.js', addresses, values, abis);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

