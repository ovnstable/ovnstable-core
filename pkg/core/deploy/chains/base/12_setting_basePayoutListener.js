const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("BasePayoutListener", 'base');

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let daiPlus = await getContract('UsdPlusToken', 'base_dai');

    let items = [];

    items.push(...baseSwap());
    // await (await pl.addItems(items)).wait();

    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'base')).address));
    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'base_dai')).address));

    console.log('BasePayoutListener setting done');


    function baseSwap(){

        let dex = 'BaseSwap';

        let items = [];

        return items;

    }


};

module.exports.tags = ['SettingBasePayoutListener'];

