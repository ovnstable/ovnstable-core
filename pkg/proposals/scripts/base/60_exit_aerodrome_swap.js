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


    let aerodromSwap = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    let aerodromSwapImp = "0x8A6cAee85d3E47Bd1D0Bc1c4d89B134C386d8AD4"; 
    addProposalItem(aerodromSwap, 'upgradeTo', [aerodromSwapImp]);

    
    addProposalItem(aerodromSwap, 'unstakeFullTmp', []);
    

    let usdcPlus = await getContract('UsdPlusToken');
    let usdcPlusNewImpl = "0x7eb8D0177CF6B11a6dB57E2AE483549Af89A7F66"; 
    addProposalItem(usdcPlus, 'upgradeTo', [usdcPlusNewImpl]);


    let strategyAerodromeProxy = "0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248";
    let usdcPlusBalance = await usdcPlus.balanceOf(strategyAerodromeProxy);
    addProposalItem(usdcPlus, 'burnTmp', [strategyAerodromeProxy, usdcPlusBalance]);

    
    let usdcPlusOldImpl = "0x1F7e713B77dcE6b2Df41Bb2Bb0D44cA35D795ed8";
    addProposalItem(usdcPlus, 'upgradeTo', [usdcPlusOldImpl]);


    let timelock = await getContract('AgentTimelock');
    let rm = await getContract('RoleManager', 'base');
    addProposalItem(aerodromSwap, 'setStrategyParams', [timelock.address, rm.address]);


    let beneficiary = "0x8df424e487De4218B347e1798efA11A078fecE90"; // !!!
    addProposalItem(aerodromSwap, 'unstake', [BASE.usdc, 1234, beneficiary, true]);


    // let pm = await getContract('PortfolioManager', 'base');
    // addProposalItem(pm, 'removeStrategy', [strategyAerodromeProxy]);


    let wallet = await initWallet();
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);

    let usdcBalanceOnStrategy0 = await usdc.balanceOf("0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248");
    let beneficiaryBalance0 = await usdc.balanceOf(beneficiary);
    console.log("usdcBalanceOnStrategy 0:       ", usdcBalanceOnStrategy0);
    console.log("beneficiaryBalance 0:          ", beneficiaryBalance0);


    await testProposal(addresses, values, abis);


    let usdcBalanceOnStrategy1 = await usdc.balanceOf("0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248");
    let beneficiaryBalance1 = await usdc.balanceOf(beneficiary);
    console.log("usdcBalanceOnStrategy 1:       ", usdcBalanceOnStrategy1);
    console.log("beneficiaryBalance 1:          ", beneficiaryBalance1);


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