const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("ArbitrumPayoutListener", 'linea');
    const usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    const usdtPlus = await getContract('UsdPlusToken', 'arbitrum_usdt');
    const ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');
    const daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let items = [];

    await (await pl.addItems(items)).wait();

    console.log('ArbitrumPayoutListener setting done');



};

module.exports.tags = ['SettingArbitrumPayoutListener'];

