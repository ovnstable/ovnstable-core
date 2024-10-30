const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
// const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
// const { swapSimulatorAerodrome } = require('@overnight-contracts/strategies-base/deploy/usdc/07_swap_simulator');
const { BigNumber } = require("ethers");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = (await initWallet()).address;
    // await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum');
    let timelock = await getContract('AgentTimelock', 'arbitrum');
    let rm = await getContract('RoleManager', 'arbitrum');

    const StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum');
    const newSiloUsdcImpl = "";

    const StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum');
    const newSiloUsdcArbImpl = "";

    const StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum');
    const newSiloUsdcWbtcImpl = "";

    const StrategySperAlpha = await getContract('StrategySperAlpha', 'arbitrum');
    const newSperAlphaImpl = "";

    const StrategySperGamma = await getContract('StrategySperGamma', 'arbitrum');
    const newSperGammaImpl = "";

    const StrategyAaveUsdc = await getContract('StrategyAaveUsdc', 'arbitrum');
    const newAaveUsdcImpl = "";

    const StrategyCompoundUsdc = await getContract('StrategyCompoundUsdc', 'arbitrum');
    const newCompoundUsdcImpl = "";

    addProposalItem(StrategySiloUsdc, "upgradeTo", [newSiloUsdcImpl]);
    addProposalItem(StrategySiloUsdcArb, "upgradeTo", [newSiloUsdcArbImpl]);
    addProposalItem(StrategySiloUsdcWbtc, "upgradeTo", [newSiloUsdcWbtcImpl]);
    addProposalItem(StrategySperAlpha, "upgradeTo", [newSperAlphaImpl]);
    addProposalItem(StrategySperGamma, "upgradeTo", [newSperGammaImpl]);
    addProposalItem(StrategyAaveUsdc, "upgradeTo", [newAaveUsdcImpl]);
    addProposalItem(StrategyCompoundUsdc, "upgradeTo", [newCompoundUsdcImpl]);
    
    // addProposalItem(StrategyAave, "setName", ["StrategyAaveBase"]);


    await testProposal(addresses, values, abis);
    // console.log(await StrategyAave.name());

    // await createProposal(filename, addresses, values, abis);

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
