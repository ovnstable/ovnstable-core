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
    
    let pm = await getContract('PortfolioManager', 'optimism');
    let rm = await getContract('RoleManager', 'optimism');
    let ex = await getContract('Exchange', 'optimism');

    let newAaveImpl = "0xFC7a6D10B10FFd7De6bb78591a800AedDa7bcdAB";
    let oldAaveImpl = "0xc69F69C6165314B9D658E5345DaDea7956145F02";
    let timelock = "0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011"; 
    

    let aaveParams = {
      usdc: OPTIMISM.usdc,
      aUsdc: OPTIMISM.aUsdcn,
      aaveProvider: OPTIMISM.aaveProvider,
      rewardsController: OPTIMISM.rewardsController,
      uniswapV3Router: OPTIMISM.uniswapV3Router,
      op: OPTIMISM.op,
      poolFee: 500 // 0.05%
    }

    


    // let lol = await pm.getAllStrategyWeights();
    // console.log(lol);
    // return;

    addProposalItem(rm, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock]);
    addProposalItem(ex, 'setTokens', [OPTIMISM.usdPlus, OPTIMISM.usdc]);
    addProposalItem(pm, 'setAsset', [OPTIMISM.usdc]);
    
    
    addProposalItem(aave, 'upgradeTo', [newAaveImpl]);

    usdc = await getERC20('usdc');
    usdce = await getERC20('usdce');
    ausdc = await getERC20('aUsdc');
    ausdcn = await getERC20('aUsdcn');

    console.log((await usdc.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await usdce.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await ausdc.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await ausdcn.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());

    // console.log(await aave.StrategyParams.usdc());

    addProposalItem(aave, 'usdcSwap', []);
    
    addProposalItem(aave, 'setParams', [aaveParams]);

    addProposalItem(aave, 'stakeAll', []);


    addProposalItem(aave, 'upgradeTo', [oldAaveImpl]);

    
    

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'optimism');
    // await testStrategy(filename, aave, 'optimism');
    // await createProposal(filename, addresses, values, abis);


    console.log((await usdc.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await usdce.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await ausdc.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());
    console.log((await ausdcn.balanceOf('0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76')).toString());

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

