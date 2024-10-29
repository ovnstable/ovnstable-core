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

    let pm = await getContract('PortfolioManager', 'base_usdc');
    let timelock = await getContract('AgentTimelock', 'base_usdc');
    let rm = await getContract('RoleManager', 'base_usdc');

    const StrategyAerodromeUsdc = await getContract('StrategyAerodromeUsdc', 'base_usdc');
    const newMintImpl = "0x66438BDB0cA346feD58DFd8E9db1F486833800F1";

    // let aero = await getERC20ByAddress(BASE.aero, wallet.address);
    // console.log("treasury before", (await aero.balanceOf(COMMON.rewardWallet)).toString());
    // console.log("strategy before", (await aero.balanceOf(StrategyAerodromeUsdc.address)).toString());

    addProposalItem(StrategyAerodromeUsdc, "upgradeTo", [newMintImpl]);
    addProposalItem(StrategyAerodromeUsdc, "_transferAero", [COMMON.rewardWallet]);
    

    // await testProposal(addresses, values, abis);
    
    // console.log("treasury before", (await aero.balanceOf(COMMON.rewardWallet)).toString());
    // console.log("strategy before", (await aero.balanceOf(StrategyAerodromeUsdc.address)).toString());

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
