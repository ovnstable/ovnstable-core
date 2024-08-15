const { ethers } = require("hardhat");
let { BSC, COMMON } = require("@overnight-contracts/common/utils/assets");
const {
    getContract,
    getPrice,
} = require("@overnight-contracts/common/utils/script-utils");
const {
    createSkim,
    createBribe,
    createSkimTo,
    createCustom,
    createSkimToWithFee,
    createCustomBribe,
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const payoutManager = await getContract("ZkSyncPayoutManager");
    let usdPlus = await getContract("UsdPlusToken", "zksync");

    let items = [];

    items.push(...syncSwap());
    items.push(...vesync());
    items.push(...mute());
    items.push(...ezkalibur());
    items.push(...kyberswap());
    items.push(...pancakeSwap());
    console.log('PayoutManager', payoutManager.address)
    await (await payoutManager.addItems(items)).wait();

    console.log("ZksyncPayoutManager setting done");

    function kyberswap() {
        let dex = "Kyberswap";

        let items = [];
        items.push(createSkim("0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc", usdPlus.address, "USDC/USD+", dex));

        return items;
    }

    function vesync() {
        let dex = "VeSync";

        let items = [];
        items.push(createSkim("0x16D0fC836FED0f645d832Eacc65106dDB67108Ef", usdPlus.address, "USDC/USD+", dex));

        return items;
    }

    function mute() {
        let dex = "Mute";

        let items = [];
        items.push(createSkim("0x3848dbd3EAc429497abd464A18fBEC78EF76f750", usdPlus.address, "USDC/USD+", dex));

        return items;
    }

    function velocoreV2() {
        let dex = "VelocoreV2";

        let items = [];
        items.push(createCustomBribe("0xd5F1cc935B3e7267a9fBfA250861672113AAEE40", usdPlus.address, "USD+/USDC", dex, "0x8FbF6e10BdD8668adDcd2A30F5a76aA3dF89bECE"));

        return items;
    }

    function syncSwap() {
        let dex = "SyncSwap";

        let items = [];
        items.push(createCustom("0x1996EcC218F6F5182732a34E92a2c6aB294DC350", usdPlus.address, "All USD+", dex));
        items.push(createSkim("0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306", usdPlus.address, "USD+/USDC", dex));

        return items;
    }

    function ezkalibur() {
        let dex = "Ezkalibur";
        let to = "0x5f112507359b2EdfB02FE8A7e9aCD66008b8343a";

        let items = [];
        items.push(createSkimToWithFee("0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13", usdPlus.address, "USDC/USD+", dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function ezkalibur() {
        let dex = "Ezkalibur";
        let to = "0x5f112507359b2EdfB02FE8A7e9aCD66008b8343a";

        let items = [];
        items.push(createSkimToWithFee("0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13", usdPlus.address, "USDC/USD+", dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function pancakeSwap() {
        let dex = "PancakeSwap";

        let items = [];
        items.push(createSkim("0x6a8Fc7e8186ddC572e149dFAa49CfAE1E571108b", usdPlus.address, "USD+-USDC", dex));

        return items;
    }
};

module.exports.tags = ["SettingZksyncPayoutManager"];
