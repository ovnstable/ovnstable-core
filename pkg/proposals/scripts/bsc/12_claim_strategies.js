const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
// const { StrategyBaseSwapUsdbcDaiParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
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

    const StrategyBaseSwapUsdbcDai = await getContract('StrategyVenusBusd', 'bsc');
    const newMintImpl = "0xad7fd70c81b09629e9bb29b94c70fe582f429e57";  

    let xbsx = await getERC20ByAddress(BASE.xbsx, wallet.address);
    console.log("treasury before", (await xbsx.balanceOf(COMMON.rewardWallet)).toString());
    console.log("strategy before", (await xbsx.balanceOf(StrategyBaseSwapUsdbcDai.address)).toString());

    addProposalItem(StrategyBaseSwapUsdbcDai, "upgradeTo", [newMintImpl]);
    addProposalItem(StrategyBaseSwapUsdbcDai, "hotFix", [COMMON.rewardWallet]);
    

    await testProposal(addresses, values, abis);
    
    console.log("treasury after", (await xbsx.balanceOf(COMMON.rewardWallet)).toString());
    console.log("strategy after", (await xbsx.balanceOf(StrategyBaseSwapUsdbcDai.address)).toString());

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
