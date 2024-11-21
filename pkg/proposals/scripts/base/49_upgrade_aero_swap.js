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
    // await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    const StrategyAerodromeSwapUsdc = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    const pm = await getContract('PortfolioManager', 'base_usdc');
    const newSwapImpl = "0xD1c7A53B2A44690806eFc453f33Fd37bcb25EA43";

    let aero = await getERC20ByAddress(BASE.aero, mainAddress);
    console.log("treasury before", (await aero.balanceOf(COMMON.rewardWallet)).toString());

    addProposalItem(StrategyAerodromeSwapUsdc, "upgradeTo", [newSwapImpl]);
    addProposalItem(StrategyAerodromeSwapUsdc, "setParams", [await strategyAerodromeUsdcParams()]);

    // addProposalItem(pm, "balance", []);
    
    // await testProposal(addresses, values, abis);

    console.log("treasury after", (await aero.balanceOf(COMMON.rewardWallet)).toString());

    // await testUsdPlus(filename, 'base_usdc');
    // await testStrategy(filename, StrategyAerodromeSwapUsdc);
    
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

