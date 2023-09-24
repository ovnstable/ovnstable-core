const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {ethers} = require("hardhat");
const axios = require("axios");

const fs = require('fs');
const readline = require('readline');

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let timelockNew =  await getContract('AgentTimelock', 'optimism');
    let timelockOld =  await getContract('OvnTimelockController', 'optimism');

    console.log('AgentTimelock: ' + timelockNew.address);
    console.log('OldTimelock:   ' + timelockOld.address);

    let coreNames = ['Exchange', 'PortfolioManager', 'UsdPlusToken', 'Mark2Market', 'Market', 'WrappedUsdPlusToken'];

    let contracts = [];

    for (const name of coreNames) {
        let contractUsdPlus = await getContract(name, 'optimism');
        contracts.push(contractUsdPlus.address);

        try {
            let contractDaiPlus = await getContract(name, 'optimism_dai');
            contracts.push(contractDaiPlus.address);
        } catch (e) {
            console.log(`Not found: ${name} for DAI+`)
        }
    }


    const fileStream = fs.createReadStream('strategies.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });



    for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        console.log(`Line from file: ${line}`);

        if (line !== '')
            contracts.push(line);
    }


    for (const address of contracts) {
        grantRevoke(addresses, values, abis, address, timelockNew, timelockOld);
    }

    // await testProposal(addresses, values, abis)
    await createProposal(addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



function grantRevoke(addresses, values, abis, address, timelockNew, timelockOld){

    addresses.push(address);
    values.push(0);
    abis.push(timelockOld.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, timelockNew.address]));

    addresses.push(address);
    values.push(0);
    abis.push(timelockOld.interface.encodeFunctionData('revokeRole', [Roles.DEFAULT_ADMIN_ROLE, timelockOld.address]));
}
