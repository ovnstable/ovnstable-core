const { ethers } = require("hardhat");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe,
    createCustom
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("BasePayoutManager", 'base');
    const usdPlus = await getContract('UsdPlusToken', 'base');
    const usdcPlus = await getContract('UsdPlusToken', 'base_usdc');

    let items = [];

    items.push(...aerodrome());

    // await (await pl.removeItems()).wait();
    await (await pl.addItems(items)).wait();
    console.log('BasePayoutManager setting done');
    function aerodrome() {
        let dex = 'Aerodrome';
        let items = [];
        items.push(createSkim('0xE96c788E66a97Cf455f46C5b27786191fD3bC50B', usdcPlus.address, 'USDC+/USD+', dex));
        return items;
    }
};

module.exports.tags = ['SettingBasePayoutManager'];

