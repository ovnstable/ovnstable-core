const { ethers } = require("hardhat");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe,
    createCustom
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const payoutManager = await getContract("OptimismPayoutManager", 'optimism');
    const usdPlus = await getContract('UsdPlusToken', 'optimism');
    const daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

    let items = [];

    items.push(...velodrome());
    await (await payoutManager.addItems(items)).wait();

    console.log('OptimismPayoutManager setting done');

    function velodrome() {

        let dex = 'Velodrome';

        let items = [];
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x67124355cce2ad7a8ea283e990612ebe12730175', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223', usdPlus.address, 'sAMMV2-USD+/DAI+', dex));
        items.push(createSkim('0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223', daiPlus.address, 'sAMMV2-USD+/DAI+', dex));
        items.push(createSkim('0xd95E98fc33670dC033424E7Aa0578D742D00f9C7', usdPlus.address, 'sAMMV2-USD+/USDC', dex));
        items.push(createSkim('0x0b28C2e41058EDc7D66c516c617b664Ea86eeC5d', usdPlus.address, 'sAMMV2-USD+/DOLA', dex));
        items.push(createBribe('0x37e7D30CC180A750C83D68ED0C2511dA10694d63', usdPlus.address, 'sAMMV2-USD+/LUSD', dex, '0x203904F6A00f15768c3e388E093E3BfcF810D552'));
        items.push(createBribe('0xD330841EF9527E3Bd0abc28a230C7cA8dec9423B', usdPlus.address, 'sAMMV2-FRAX/USD+', dex, '0x07242953F8B338552267904Ae1eb6C236DA85592'));
        items.push(createBribe('0x844D7d2fCa6786Be7De6721AabdfF6957ACE73a0', usdPlus.address, 'vAMMV2-OVN/USD+', dex, '0x2734D75d6394c34bE4868D46960Bb1244fdc56F6'));
        items.push(createSkim('0x46e1B51e07851301f025ffeA506b140dB80a214A', usdPlus.address, 'sAMMV2-USDC/USD+', dex));
        items.push(createSkim('0x9dA9D8dCdAC3Cab214d2bd241C3835B90aA8fFdE', usdPlus.address, 'CL100-WETH/USD+', dex));
        items.push(createSkim('0x995eB8f1A44824E58352E6F83d4d64801243468D', usdPlus.address, 'CL200-OP/USD+', dex));
        items.push(createSkim('0xfd5F39c74E63f1dacE336350afDF11E85BBD56F4', usdPlus.address, 'CL1-USDC/USD+', dex));
        return items;
    }

};

module.exports.tags = ['SettingOptimismPayoutManager'];

