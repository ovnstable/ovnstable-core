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
    let fenixSwapImp = "0xDeF7E2F57a54BE20563d464790410d1ce8C01d9e"

    let swapSimulator = await getContract('SwapSimulatorFenix', 'blast');
    let swapSimulatorImp = "0xE8b9F540D3fDD9B60CBFfE73d27Cc67d77054146"

    addProposalItem(fenixSwap, 'upgradeTo', [fenixSwapImp])
    addProposalItem(fenixSwap, 'setParams', [await getParams()]);

    addProposalItem(swapSimulator, 'upgradeTo', [swapSimulatorImp])

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
        binSearchIterations: 20,
        swapSimulatorAddress: '0xD34063601f4f512bAB89c0c0bF8aa947cAa55885', // SwapSimulatorFenix address 
        npmAddress: '0x8881b3fb762d1d50e6172f621f107e24299aa1cd', 
        lowerTick: -1,
        upperTick: 0,
        fnxTokenAddress: '0x52f847356b38720b55ee18cb3e094ca11c85a192',
        poolFnxUsdb: '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
        rewardSwapSlippageBP: 500,
        liquidityDecreaseDeviationBP: 500
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });