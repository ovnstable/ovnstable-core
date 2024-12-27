const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let aerodromSwap = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    let aerodromSwapImp = "0x7c303627D3d379BAbced8f59034061A0FDb8D1B1"

    let swapSimulator = await getContract('SwapSimulatorAerodrome', 'base_usdc');
    let swapSimulatorImp = "0xF646cC0e376AD3E9ddb812EE2276215f0a5994aB"

    addProposalItem(aerodromSwap, 'upgradeTo', [aerodromSwapImp])

    addProposalItem(aerodromSwap, 'setParams', [await getParams()]);

    addProposalItem(swapSimulator, 'upgradeTo', [swapSimulatorImp])

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function getParams() {
    return {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d', // v2 pool
        binSearchIterations: 20,
        swapSimulatorAddress: "0x8F573ABeb41c232faA1661E222c8E4F658b83B06",
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50,
        swapRouter: BASE.aerodromeRouter,
        treasury: COMMON.rewardWallet,
        treasuryShare: 8000,
        lowerTick: -1,
        upperTick: 0,
        liquidityDecreaseDeviationBP: 500
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });