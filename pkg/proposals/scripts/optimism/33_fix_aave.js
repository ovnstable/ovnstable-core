const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20 } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const {OPTIMISM, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let aave = await getContract('StrategyAave', 'optimism');
    
    let oldAaveImpl = "0xc69f69c6165314b9d658e5345dadea7956145f02"; // если что эта та имплементация которая на самом деле там была до тебя и до тех правок, которые мы смотрели, в репег комите
    let newAaveImpl = "0x1236f2Bae307d9EFa1b055C2577613e07b1aaFa9";
    
    addProposalItem(aave, 'upgradeTo', [newAaveImpl]);
    addProposalItem(aave, 'setStrategyParams', ["0xe1E36e93D31702019D38d2B0F6aB926f15008409", "0x63a4CA86118b8C1375565563D53D1826DFcf8801"]);
    addProposalItem(aave, "setStrategyName", ["AAVE"]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'optimism');

    await createProposal(filename, addresses, values, abis);


    // console.log("portfolioManager", await aave.portfolioManager());
    // console.log("swapSlippageBP", (await aave.swapSlippageBP()).toString());
    // console.log("navSlippageBP", (await aave.navSlippageBP()).toString());
    // console.log("stakeSlippageBP", (await aave.stakeSlippageBP()).toString());
    // console.log("roleManager", await aave.roleManager());
    // console.log("name", await aave.name());

    // console.log("usdcToken", await aave.usdcToken());
    // console.log("aUsdcToken", await aave.aUsdcToken());
    // console.log("aaveProvider", await aave.aaveProvider());
    // console.log("rewardsController", await aave.rewardsController());
    // console.log("uniswapV3Router", await aave.uniswapV3Router());
    // console.log("opToken", await aave.opToken());
    // console.log("poolFee", await aave.poolFee());
    

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

