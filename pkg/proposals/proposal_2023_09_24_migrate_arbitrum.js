const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {ethers} = require("hardhat");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let timelockNew =  await getContract('AgentTimelock', 'arbitrum');
    let timelockOld =  await getContract('OvnTimelockController', 'arbitrum');

    console.log('AgentTimelock: ' + timelockNew.address);
    console.log('OldTimelock:   ' + timelockOld.address);

    let coreNames = ['Exchange', 'PortfolioManager', 'UsdPlusToken', 'Mark2Market', 'Market', 'WrappedUsdPlusToken'];

    let contracts = [];

    for (const name of coreNames) {
        let contractUsdPlus = await getContract(name, 'arbitrum');
        contracts.push(contractUsdPlus.address);

        let contractDaiPlus = await getContract(name, 'arbitrum_dai');
        contracts.push(contractDaiPlus.address);
    }

    let pm = await getContract('PortfolioManager');
    let strategies = await pm.getAllStrategyWeights();

    for (const weight of strategies) {
        contracts.push(weight.strategy);
    }

    // ETS Mu
    contracts.push('0x511b79A6e0C6D07eb23bB735c5dbe901C2B54B7F')
    contracts.push('0xa41b1FDe9495051CaE6e2C98f9Ff763335f75cf0')
    contracts.push('0x21775B8A8A12E195CCA680657306753B46BD9faa')

    // ETS BlackHole
    contracts.push('0x849b45d86C24BF8D33bC3cF7C6e37E9f83e2351F')
    contracts.push('0xe2fe8783CdC724EC021FF9052eE8EbEd00e6248e')
    contracts.push('0x792AA87af9250A51e8C37Bfc97FE4D367dCEBE25')

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
