const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync} = require("@overnight-contracts/common/utils/payoutListener");
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
        items.push(createSkim('0x3F006B0493ff32B33be2809367F5F6722CB84a7b', usdPlus.address, 'USDC/USD+/USDT+', dex));
        items.push(createSkim('0xB30e7A2E6f7389cA5dDc714Da4c991b7A1dCC88e', usdtPlus.address, 'USDC/USD+/USDT+', dex));

        return items;
    }

};

module.exports.tags = ['SettingLineaPayoutListener'];

