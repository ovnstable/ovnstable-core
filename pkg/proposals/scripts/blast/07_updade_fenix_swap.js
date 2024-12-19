const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let fenixSwap = await getContract('StrategyFenixSwap', 'blast');
    let newImplementation = "0xCd5422de33eC046dffF87ba12B13d0eF6543A032"

    addProposalItem(fenixSwap, 'upgradeTo', [newImplementation])
    // abis.push(fenixSwap.interface.encodeFunctionData('upgradeTo', [newImplementation]));

    addProposalItem(fenixSwap, 'setParams', [await getParams()]);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

async function getParams() {
    return {
        pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885', // SwapSimulatorFenix address 
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 

        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',

        // Fenix's pools for reward swaping
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        poolUsdbUsdPlus: '0x52f847356b38720b55ee18cb3e094ca11c85a192', // Just placeholder

        rewardSwapSlippageBP: 50
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

