const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("BasePayoutListener", 'base');
    const usdPlus = await getContract('UsdPlusToken', 'base');
    const daiPlus = await getContract('UsdPlusToken', 'base_dai');

    let items = [];
    items.push(...baseSwap());
    items.push(...velocimeter());

    let price = await getPrice();

//    await (await pl.removeItem(usdPlus.address, '0x42731e7774cf1b389fe2d9552bbdd6e4bb05e42b', price)).wait();
//    await (await pl.removeItems(price)).wait();
    await (await pl.addItems(items, price)).wait();

    console.log('BasePayoutListener setting done');


    function baseSwap() {

        let dex = 'BaseSwap';
        let to = '0xaf1823bacd8edda3b815180a61f8741fa4abc6dd';

        let items = [];
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;

    }

    function velocimeter() {

        let dex = 'Velocimeter';

        let items = [];
        items.push(createBribeWithFee('0x298c9f812c470598c5f97e3da9261a9899b89d35', usdPlus.address, 'DAI+/USD+', dex, '0x508dE140Aa70d696E5feb6B718f44b2538500ab5', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x298c9f812c470598c5f97e3da9261a9899b89d35', daiPlus.address, 'DAI+/USD+', dex, '0x508dE140Aa70d696E5feb6B718f44b2538500ab5', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x653685aa9913c6ab13d659a4ea8f358ecec3d34f', usdPlus.address, 'USD+/USDbC', dex, '0x3be8Bc75E0902f4F51316eE8F142Bc1F0C57948e', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x42731e7774cf1b389fe2d9552bbdd6e4bb05e42b', daiPlus.address, 'DAI+/USDbC', dex, '0x18DBECb056aCFb8C731483207FC4029ca09D6aE1', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x4a9683ab8f705ef3cf61c6466e77471aef41abd5', usdPlus.address, 'ERN/USD+', dex, '0xc8334Db5dB446FCcF47E48E30A5E0b95576Bea09', 20, COMMON.rewardWallet));

        return items;

    }

};

module.exports.tags = ['SettingBasePayoutListener'];

