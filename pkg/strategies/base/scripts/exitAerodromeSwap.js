const {getContract, getPrice, showM2M, initWallet, getERC20ByAddress, transferAsset} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");
const { BASE } = require("@overnight-contracts/common/utils/assets");


async function main() {

    // Организационные моменты

    let wallet = await initWallet();
    let usdcPlus = await getContract('UsdPlusToken');
    let usdc = await getERC20ByAddress(BASE.usdc, wallet.address);
    let timelock = await getContract('AgentTimelock');
    let pm = await getContract('PortfolioManager', 'base');
    let rm = await getContract('RoleManager', 'base');
    let m2m = await getContract('Mark2Market', 'base_usdc'); 

    let cashStrategy = await getContract('StrategyMoonwellUsdc', 'base_usdc');

    console.log("cashStrategy.address: ", cashStrategy.address);
    
    let cashNAV = await cashStrategy.netAssetValue();
    console.log("cashNAV: ", cashNAV);


    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", [timelock.address]);
    const timelockSigner = provider.getSigner(timelock.address);
    
    let strategy = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    await strategy.connect(timelockSigner).setStrategyParams(timelock.address, rm.address);



    console.log("M2M: ", m2m.address)

    await usdcPlus.testIt();

    // Достаем деньги из Aerodrome

    // 0
    let usdcPlusBalance0 = await usdcPlus.balanceOf(strategy.address);
    let usdcBalance0 = await usdc.balanceOf(strategy.address);
    let usdcPlusTVL0 = await usdcPlus.totalSupply();
    let totalNetAssets0 = await m2m.totalNetAssets();
    let cashNAV0 = await cashStrategy.netAssetValue();
    let swapNAV0 = await strategy.netAssetValue();

    console.log("before decrease liquidity")
    console.log("USDC+ balance 0:     ", usdcPlusBalance0);
    console.log("USDC balance 0:      ", usdcBalance0);
    console.log("usdcPlusTVL0:        ", usdcPlusTVL0);
    console.log("totalNetAssets0:     ", totalNetAssets0)
    console.log("cashNAV0:            ", cashNAV0);
    console.log("swapNAV0:            ", swapNAV0);
    console.log("")



    await strategy.connect(timelockSigner).unstakeFullTmp();

    // 1
    let usdcPlusBalance1 = await usdcPlus.balanceOf(strategy.address);
    let usdcBalance1 = await usdc.balanceOf(strategy.address);
    let usdcPlusTVL1 = await usdcPlus.totalSupply();
    let totalNetAssets1 = await m2m.totalNetAssets();
    let cashNAV1 = await cashStrategy.netAssetValue();
    let swapNAV1 = await strategy.netAssetValue();

    // await strategy.netAssetValue();

    console.log("after unstake")
    console.log("USDC+ balance 1:     ", usdcPlusBalance1);
    console.log("USDC balance 1:      ", usdcBalance1);
    console.log("usdcPlusTVL1:        ", usdcPlusTVL1);
    console.log("totalNetAssets1:     ", totalNetAssets1)
    console.log("cashNAV1:            ", cashNAV1);
    console.log("swapNAV1:            ", swapNAV1);
    console.log("")



    // Сбернить все USDC+ на стратегии 

    console.log("Try to burn some USDC+...");
    await (await usdcPlus.connect(timelockSigner).burnTmp(strategy.address, usdcPlusBalance1)).wait();
    console.log("Burned!")

    // 2
    let usdcPlusBalance2 = await usdcPlus.balanceOf(strategy.address);
    let usdcBalance2 = await usdc.balanceOf(strategy.address);
    let usdcPlusTVL2 = await usdcPlus.totalSupply();
    let totalNetAssets2 = await m2m.totalNetAssets();
    let cashNAV2 = await cashStrategy.netAssetValue();
    let swapNAV2 = await strategy.netAssetValue();

    console.log("after burn")
    console.log("USDC+ balance 2:     ", usdcPlusBalance2);
    console.log("USDC balance 2:      ", usdcBalance2);
    console.log("usdcPlusTVL2:        ", usdcPlusTVL2);
    console.log("totalNetAssets2:     ", totalNetAssets2)
    // console.log("totalNetAssets2:     ", totalNetAssets1)
    console.log("cashNAV2:            ", cashNAV2);
    console.log("swapNAV2:            ", swapNAV2);
    console.log("")
    


    let beneficiary = "0x8df424e487De4218B347e1798efA11A078fecE90";

    let usdcBalance3 = await usdc.balanceOf(strategy.address);
    let beneficiaryBalance3 = await usdc.balanceOf(beneficiary);

    console.log("USDC balance 3:      ", usdcBalance3);
    console.log("beneficiaryBalance3: ", beneficiaryBalance3);


    await strategy.connect(timelockSigner).unstake(usdc.address, 7, beneficiary, true);

    let usdcBalance4 = await usdc.balanceOf(strategy.address);
    let beneficiaryBalance4 = await usdc.balanceOf(beneficiary);

    console.log("USDC balance 4:      ", usdcBalance4);
    console.log("beneficiaryBalance4: ", beneficiaryBalance4);




   

    
    
    

    // let usdcPlusAfter = await usdcPlus.balanceOf(strategy.address);
    // console.log("USDC+ on strategy after:  ", usdcPlusAfter);
    // console.log("strategy.address: ", strategy.address);

    // let usdcPlusTVL2 = await usdcPlus.totalSupply();
    // console.log("usdcPlusTVL2: ", usdcPlusTVL2);


    // 67047933243791
    //            777

    // 67047933166014

    


    // 199999998
    // 199922221
    





    // console.log("Try to transfer...");
    // await usdcPlus.transfer("0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248", 444444);
    // console.log("Transfered!");

    // let usdcPlusAfter = await usdcPlus.balanceOf(strategy.address);
    // console.log("USDC+ on strategy after:  ", usdcPlusAfter);



    // console.log("Try to creditsBalanceOfHighres...");
    // console.log("usdcPlus.address: ", usdcPlus.address);

    // let result = await usdcPlus.creditsBalanceOfHighres("0x85483696Cc9970Ad9EdD786b2C5ef735F38D156f"); // TypeError: usdcPlus.creditsBalanceOfHighres is not a function

    // console.log("RESULT: ", result);
}

    // await transferAsset(BASE.usdcPlus, strategy.address, 99999999);


// РАБОТАЮТ:
// 1. usdcPlus.balanceOf
// 2. usdcPlus.transfer

// НЕ РАБОТАЮТ:
// 1. usdcPlus.creditsBalanceOfHighres
// 2. usdcPlus.burnTmp


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });