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
    items.push(...own());
    items.push(...lynex());
    items.push(...velocore());

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

        let items = [];
        items.push(createSkim('0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177', usdtPlus.address, 'USDT+/USDT', dex));
        items.push(createBribe('0x58aacbccaec30938cb2bb11653cad726e5c4194a', usdPlus.address, 'USDC/USD+', dex, '0x2198BbF8A4f1A52161ab3411897CC4fb4E2CD5ca'));
        items.push(createBribe('0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91', usdPlus.address, 'USDT+/USD+', dex, '0xcC56DD87294fDA597F71ABADE8e233cF3A84fE43'));
        items.push(createBribe('0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91', usdtPlus.address, 'USDT+/USD+', dex, "0xcC56DD87294fDA597F71ABADE8e233cF3A84fE43"));
        items.push(createSkim('0x93b6d53d8a33c92003D0c41065cb2842934C2619', usdtPlus.address, 'USDT+/USDT', dex));
        items.push(createSkimToWithFee('0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711', usdPlus.address, 'vAMM-FLY/USD+', dex, '0x4015363dba83Bd7c922B190Ca8D283481ba99116', 20,  COMMON.rewardWallet));
        items.push(createBribe('0x2c5455EC697254B9c649892eEd425126791e334a', usdPlus.address, 'EURO3/USD+', dex, "0x4489E4e7973967a05a5311b4E099A25D3f31c392"));
        
        return items;
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

