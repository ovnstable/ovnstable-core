const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("LineaPayoutListener", 'linea');
    const usdPlus = await getContract('UsdPlusToken', 'linea');
    const usdtPlus = await getContract('UsdPlusToken', 'linea_usdt');

    let items = [];
    items.push(...velocore());

    let price = await getPrice();
    await (await pl.addItems(items, price)).wait();

    console.log('LineaPayoutListener setting done');


    function velocore() {

        let dex = 'Velocore';

        let items = [];
        items.push(createCustomBribe('0x3F006B0493ff32B33be2809367F5F6722CB84a7b', usdPlus.address, 'USDC/USD+/USDT+', dex, '0x9582B6Ad01b308eDAc14CB9BDF21e7Da698b5EDD'));
        items.push(createCustomBribe('0xB30e7A2E6f7389cA5dDc714Da4c991b7A1dCC88e', usdtPlus.address, 'USDC/USD+/USDT+', dex, '0xE0c6FDf4EFC676EB35EA094f2B01Af216F9C232c'));

        return items;
    }

};

module.exports.tags = ['SettingLineaPayoutListener'];

