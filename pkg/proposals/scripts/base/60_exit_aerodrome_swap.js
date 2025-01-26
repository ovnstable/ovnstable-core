const { getContract, showM2M, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
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

    let strategy = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    let cashStrategy = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    let m2m = await getContract('Mark2Market', 'base_usdc'); 


    let aerodromSwap = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    let aerodromSwapImp = "0x8A6cAee85d3E47Bd1D0Bc1c4d89B134C386d8AD4"; 
    addProposalItem(aerodromSwap, 'upgradeTo', [aerodromSwapImp]);

    
    addProposalItem(aerodromSwap, 'unstakeFullTmp', []);
    

    let usdcPlus = await getContract('UsdPlusToken');
    let usdcPlusNewImpl = "0x7919c6F43F0B277F22f5aEA5134b148A8C33d36B"; 
    addProposalItem(usdcPlus, 'upgradeTo', [usdcPlusNewImpl]);


    addProposalItem(usdcPlus, 'burnTmp', []);
    

    let usdcPlusOldImpl = "0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8";
    addProposalItem(usdcPlus, 'upgradeTo', [usdcPlusOldImpl]);


    let timelock = await getContract('AgentTimelock');
    let rm = await getContract('RoleManager', 'base');
    addProposalItem(aerodromSwap, 'setStrategyParams', [timelock.address, rm.address]);


    // let pm = await getContract('PortfolioManager', 'base');
    // addProposalItem(pm, 'removeStrategy', [strategyAerodromeProxy]);


    let wallet = await initWallet();
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    
    let beneficiaryBalance0 = await usdc.balanceOf(beneficiary);
    let usdcPlusBalance0 = await usdcPlus.balanceOf(strategy.address);
    let usdcBalance0 = await usdc.balanceOf(strategy.address);
    let usdcPlusTVL0 = await usdcPlus.totalSupply();
    let totalNetAssets0 = await m2m.totalNetAssets();
    let cashNAV0 = await cashStrategy.netAssetValue();
    let swapNAV0 = await strategy.netAssetValue();

    console.log("beneficiaryBalance 0:", beneficiaryBalance0);
    console.log("USDC+ balance 0:     ", usdcPlusBalance0);
    console.log("USDC balance 0:      ", usdcBalance0);
    console.log("usdcPlusTVL0:        ", usdcPlusTVL0);
    console.log("totalNetAssets0:     ", totalNetAssets0)
    console.log("cashNAV0:            ", cashNAV0);
    console.log("swapNAV0:            ", swapNAV0);


    await testProposal(addresses, values, abis);

    let beneficiaryBalance1 = await usdc.balanceOf(beneficiary);
    let usdcPlusBalance1 = await usdcPlus.balanceOf(strategy.address);
    let usdcBalance1 = await usdc.balanceOf(strategy.address);
    let usdcPlusTVL1 = await usdcPlus.totalSupply();
    let totalNetAssets1 = await m2m.totalNetAssets();
    let cashNAV1 = await cashStrategy.netAssetValue();
    let swapNAV1 = await strategy.netAssetValue();

    console.log("beneficiaryBalance 1:", beneficiaryBalance1);
    console.log("USDC+ balance 1:     ", usdcPlusBalance1);
    console.log("USDC balance 1:      ", usdcBalance1);
    console.log("usdcPlusTVL1:        ", usdcPlusTVL1);
    console.log("totalNetAssets1:     ", totalNetAssets1)
    console.log("cashNAV1:            ", cashNAV1);
    console.log("swapNAV1:            ", swapNAV1);
    console.log("")


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