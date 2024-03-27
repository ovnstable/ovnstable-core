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
};

module.exports.tags = ["SettingBlastPayoutManager"];
