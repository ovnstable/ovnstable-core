const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe, createCustom} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const BigNumber = require('bignumber.js');
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("OptimismPayoutListener", 'localhost');

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

    let items = [];

//    items.push(...velodrome());
    items.push(...defiEdge());

//    await (await pl.removeItem(usdPlus.address, '0xDf4bB088B1F02881AD4497b6FA7C1E4F81B61C0a')).wait();
//    await (await pl.removeItem(usdPlus.address, '0x98dc12979a34ee2f7099b1cbd65f9080c5a3284f')).wait();
//    await (await pl.removeItems()).wait();
    await (await pl.addItems(items)).wait();

//    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'optimism')).address)).wait();
//    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'optimism_dai')).address)).wait();

    console.log('OptimismPayoutListener setting done');

    function velodrome() {

        let dex = 'Velodrome';

        let items = [];
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x67124355cce2ad7a8ea283e990612ebe12730175', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0xf2438edf9d5db2dbc6866ef01c9eb7ca1ca8ad13', usdPlus.address, 'vAMM-USD+/USDC', dex));
        items.push(createSkim('0xa99817d2d286C894F8f3888096A5616d06F20d46', usdPlus.address, 'sAMM-USD+/DOLA', dex));
        items.push(createSkim('0x947A96B025C70497DbC0D095D966f3B59a675a70', usdPlus.address, 'sAMM-FRAX/USD+', dex));
        items.push(createSkim('0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223', usdPlus.address, 'sAMMV2-USD+/DAI+', dex));
        items.push(createSkim('0x667002F9DC61ebcBA8Ee1Cbeb2ad04060388f223', daiPlus.address, 'sAMMV2-USD+/DAI+', dex));
        items.push(createSkim('0xd95E98fc33670dC033424E7Aa0578D742D00f9C7', usdPlus.address, 'sAMMV2-USD+/USDC', dex));
        items.push(createSkim('0x0b28C2e41058EDc7D66c516c617b664Ea86eeC5d', usdPlus.address, 'sAMMV2-USD+/DOLA', dex));
        items.push(createSkim('0xD330841EF9527E3Bd0abc28a230C7cA8dec9423B', usdPlus.address, 'sAMMV2-FRAX/USD+', dex));

        items.push(createBribe('0x8a9Cd3dce710e90177B4332C108E159a15736A0F', usdPlus.address, 'sAMM-USD+/LUSD', dex, '0x41a7540ec8cb3afafe16a834abe0863f22016ec0'));
        items.push(createBribe('0x37e7D30CC180A750C83D68ED0C2511dA10694d63', usdPlus.address, 'sAMMV2-USD+/LUSD', dex, '0x203904F6A00f15768c3e388E093E3BfcF810D552'));

        return items;
    }

    function defiEdge() {

        let dex = 'DefiEdge';

        let items = [];
        items.push(createCustom('0xD1C33D0AF58eB7403f7c01b21307713Aa18b29d3', usdPlus.address, 'USD+', dex, COMMON.rewardWallet, -100, 100));

        return items;
    }
};

module.exports.tags = ['SettingOptimismPayoutListener'];

