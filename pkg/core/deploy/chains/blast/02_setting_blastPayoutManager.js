const { ethers } = require("hardhat");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe,
    createCustom
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const payoutManager = await getContract("BlastPayoutManager", 'blast');
    const usdPlus = await getContract('UsdPlusToken', 'blast');

    let items = [];

    items.push(...test());
    await (await payoutManager.addItems(items)).wait();

    console.log('BlastPayoutManager setting done');

    function test() {

        let dex = 'test';

        let items = [];
        items.push(createSkim('test', usdbPlus.address, 'test', dex));

        return items;
    }

};

module.exports.tags = ['SettingBlastPayoutManager'];

