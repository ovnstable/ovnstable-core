const { ethers } = require("hardhat");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe, createCustom } = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");

module.exports = async () => {
    const payoutManager = await getContract("BlastPayoutManager", "blast");
    const usdPlus = await getContract("UsdPlusToken", "blast");
    const usdcPlus = await getContract("UsdPlusToken", "blast_usdc");

    let items = [];

    items.push(...swapBlast());
    items.push(...thruster());
    await (await payoutManager.addItems(items)).wait();

    console.log("BlastPayoutManager setting done");

    function swapBlast() {

        let dex = "SwapBlast";
        let to = "0xfD5844867387Cecc3A0393b3e0BE32479Ea9e61a";
        let fee = 20;
        
        items.push(createSkimToWithFee('0x49B6992DbACf7CAa9cbf4Dbc37234a0167b8edCD', usdPlus.address, 'USD+/USDB', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xB70Ab4C4BE5872fDD22f43C5907428198CDCB2d5', usdPlus.address, 'USD+/USDC+', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xB70Ab4C4BE5872fDD22f43C5907428198CDCB2d5', usdcPlus.address, 'USD+/USDC+', dex, to, fee, COMMON.rewardWallet));
        return items;
                
    }

    function thruster() {

        let dex = "Thruster";
        
        items.push(createSkim('0xF2d0a6699FEA86fFf3EB5B64CDC53878e1D19D6f', usdPlus.address, 'USDB/USD+', dex));
        items.push(createSkim('0x21f25b792d2e14378F93A4C3260A53f4a889e68D', usdPlus.address, 'wETH/USD+', dex));
        items.push(createSkim('0xF4Ef0fec1CC82042a591Bccc691730bd1c6F5eb6', usdPlus.address, 'sFRAX/USD+', dex));
       
        return items;
                
    }
};

module.exports.tags = ["SettingBlastPayoutManager"];
