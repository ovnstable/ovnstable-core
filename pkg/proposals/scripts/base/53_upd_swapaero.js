const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
const { swapSimulatorAerodrome } = require('@overnight-contracts/strategies-base/deploy/usdc/07_swap_simulator');
const { BigNumber } = require("ethers");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    const StrategyAerodromeSwapUsdc = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    const newSwapImpl = "0x1236f2Bae307d9EFa1b055C2577613e07b1aaFa9";

    addProposalItem(StrategyAerodromeSwapUsdc, "upgradeTo", [newSwapImpl]);
    addProposalItem(StrategyAerodromeSwapUsdc, "setParams", [await strategyAerodromeUsdcParams()]);

    // addProposalItem(pm, "balance", []);
    
    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'base_usdc');
    await testStrategy(filename, StrategyAerodromeSwapUsdc);
    
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

