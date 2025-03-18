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
    items.push(...ambient());  
    items.push(...bladeswap());
    items.push(...fenixfinance());
    await (await payoutManager.addItems(items)).wait();

    console.log("BlastPayoutManager setting done");

    function swapBlast() {

        let items = [];
        let dex = "SwapBlast";
        let to = "0xfD5844867387Cecc3A0393b3e0BE32479Ea9e61a";
        let fee = 20;
        
        items.push(createSkimToWithFee('0x49B6992DbACf7CAa9cbf4Dbc37234a0167b8edCD', usdPlus.address, 'USD+/USDB', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xB70Ab4C4BE5872fDD22f43C5907428198CDCB2d5', usdPlus.address, 'USD+/USDC+', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xB70Ab4C4BE5872fDD22f43C5907428198CDCB2d5', usdcPlus.address, 'USD+/USDC+', dex, to, fee, COMMON.rewardWallet));
        return items;
                
    }

    function thruster() {

        let items = [];
        let dex = "Thruster";
        
        items.push(createSkim('0xF2d0a6699FEA86fFf3EB5B64CDC53878e1D19D6f', usdPlus.address, 'USDB/USD+', dex));
        items.push(createSkim('0x147e7416d5988b097b3a1859efecc2c5e04fdf96', usdPlus.address, 'USDB/USD+', dex));
        items.push(createSkim('0x21f25b792d2e14378F93A4C3260A53f4a889e68D', usdPlus.address, 'wETH/USD+', dex));
        items.push(createSkim('0xF4Ef0fec1CC82042a591Bccc691730bd1c6F5eb6', usdPlus.address, 'sFRAX/USD+', dex));
       
        return items;
                
    }

    function ambient() {

        let items = [];
        let dex = "Ambient";
        let to = "0xc73C8C60ea7d7f4338F9A8542927F4F1471e36ed";
        let fee = 20;
        items.push(createSkimToWithFee('0xaAaaaAAAFfe404EE9433EEf0094b6382D81fb958', usdPlus.address, 'USD+', dex, to, fee, COMMON.rewardWallet));
        return items;
                
    }

    function bladeswap() {

        let items = [];
        let dex = "BladeSwap";
        items.push(createSkim('0x0beEdE4DD53e281d110020185f1EB59D2F5Ce3f4', usdPlus.address, 'ETH/USD+', dex));
        items.push(createSkim('0xCF4A1d04b19855484e5Ab28740905db277E96953', usdPlus.address, 'USDB/USD+', dex));
        return items;
                
    }

    function fenixfinance() {

        let items = [];
        let dex = "FenixFinance";

        items.push(createSkim('0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f', usdPlus.address, 'USDB/USD+', dex));
        items.push(createSkim('0xc5910a7f3b0119ac1a3ad7A268CcE4A62d8C882D', usdPlus.address, 'WETH/USD+', dex));
        return items;
                
    }
    
    
};

module.exports.tags = ["SettingBlastPayoutManager"];
