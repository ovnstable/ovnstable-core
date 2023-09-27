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


    let timelockNew =  await getContract('AgentTimelock', 'zksync');
    let timelockOld =  await getContract('OvnTimelockController', 'zksync');

    console.log('AgentTimelock: ' + timelockNew.address);
    console.log('OldTimelock:   ' + timelockOld.address);

    let coreNames = ['Exchange', 'PortfolioManager', 'UsdPlusToken', 'Mark2Market'];

    let contracts = [];

    for (const name of coreNames) {
        let contractUsdPlus = await getContract(name, 'zksync');
        contracts.push(contractUsdPlus.address);
    }


    const fileStream = fs.createReadStream('zksync_strategies.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });



    for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        console.log(`Line from file: ${line}`);

        if (line !== ''){
            contracts.push(line);
        }
    }


    for (const address of contracts) {
        grantRevoke(addresses, values, abis, address, timelockNew, timelockOld);
    }

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
    abis.push(timelockOld.interface.encodeFunctionData('grantRole', [Roles.UPGRADER_ROLE, timelockNew.address]));

    addresses.push(address);
    values.push(0);
    abis.push(timelockOld.interface.encodeFunctionData('revokeRole', [Roles.UPGRADER_ROLE, timelockOld.address]));

    addresses.push(address);
    values.push(0);
    abis.push(timelockOld.interface.encodeFunctionData('revokeRole', [Roles.DEFAULT_ADMIN_ROLE, timelockOld.address]));

}
