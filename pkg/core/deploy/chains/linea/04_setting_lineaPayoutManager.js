const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const payoutManager = await getContract("LineaPayoutManager", 'linea');
    const usdPlus = await getContract('UsdPlusToken', 'linea');
    const usdtPlus = await getContract('UsdPlusToken', 'linea_usdt');

    let items = [];
    // items.push(...velocore());
    // items.push(...own());
    items.push(...lynex())

    await (await payoutManager.addItems(items)).wait();

    console.log('LineaPayoutListener setting done');

    function own() {

        let dex = 'PayoutManager';
        
        let items = [];
        items.push(createSkim(payoutManager.address, usdtPlus.address, 'USDT+', dex));
        items.push(createSkim(payoutManager.address, usdPlus.address, 'USD+', dex));

        return items;
    }

    function lynex() {
        let dex = 'Lynex';
        return [
            createSkim('0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91', usdPlus.address, 'USDT+/USD+', dex),
            createSkim('0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91', usdtPlus.address, 'USDT+/USD+', dex)
            // я добавил оба токена 
        ]

    }

    function velocore() {

        let dex = 'Velocore';

        let items = [];
        items.push(createCustomBribe('0x3F006B0493ff32B33be2809367F5F6722CB84a7b', usdPlus.address, 'USDC/USD+/USDT+', dex, '0x9582B6Ad01b308eDAc14CB9BDF21e7Da698b5EDD'));
        items.push(createCustomBribe('0xB30e7A2E6f7389cA5dDc714Da4c991b7A1dCC88e', usdtPlus.address, 'USDC/USD+/USDT+', dex, '0xE0c6FDf4EFC676EB35EA094f2B01Af216F9C232c'));

        return items;
    }

};

module.exports.tags = ['SettingLineaPayoutManager'];

