const {ethers} = require("hardhat");

let {BSC, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe, createSkimTo} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({getNamedAccounts, deployments}) => {


    const pl = await ethers.getContract("BscPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'bsc');
    let usdtPlus = await getContract('UsdPlusToken', 'bsc_usdt');
    let etsAlpha = '0x5B852898CD47d2Be1d77D30377b3642290f5Ec75';

    let items = [];

    items.push(...wombat());
    items.push(...thena());
    items.push(...pacnake());

    await (await pl.addItems(items)).wait();

    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'bsc')).address)).wait();
    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'bsc_usdt')).address)).wait();
    // await (await pl.grantRole(Roles.EXCHANGER, '0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D')).wait(); // HedgeExchangeAlphaBsc

    console.log('BscPayoutListener setting done');

    function pacnake(){

        let dex = 'Pancake';

        let items = [];
        items.push(createSkim('0x2BD37f67EF2894024D3ee52b20A6cB87d71B2933', usdPlus.address, 'USD+/BUSD', dex));

        return items;
    }


    function thena(){

        let dex = 'Thena';

        let items = [];
        // items.push(createBribe('0x92573046BD4abA37d875eb45a0A1182ac63d5580', usdPlus.address, 'sAMM-ETS Alpha/USD+', dex, '0x90ab86ddd5fdae0207367c2d09e10ef1fb3cb651'));
        // items.push(createBribe('0x1F3cA66c98d682fA1BeC31264692daD4f17340BC', usdPlus.address, 'sAMM-HAY/USD+', dex, '0x8FbF01a6D3Fef2847f2c35d9a05476eb859D6B2e'));
        // items.push(createBribe('0x150990B9630fFe2322999e86905536E2E7e8d93f', usdPlus.address, 'sAMM-USD+/CUSD', dex, '0x8828Bd1b7abc5296D3FcfEb15F58c23088410449'));
        // items.push(createBribe('0xea9abc7AD420bDA7dD42FEa3C4ACd058902A5845', usdPlus.address, 'sAMM-USDT/USD+', dex, '0xe52917158c3C8e29Ae3B5458200cbF516E56F660'));
        // items.push(createBribe('0x7F74D8C2A0D0997695eA121A2155e2710a6D62dc', usdPlus.address, 'vAMM-USD+/THE', dex, '0x39d46d0f49fab60002d2f359d1497ffbfc889ea6'));

        items.push(createSkim('0x1F3cA66c98d682fA1BeC31264692daD4f17340BC', usdPlus.address, 'sAMM-HAY/USD+', dex));
        items.push(createSkim('0x150990B9630fFe2322999e86905536E2E7e8d93f', usdPlus.address, 'sAMM-USD+/CUSD', dex));
        items.push(createSkim('0xea9abc7AD420bDA7dD42FEa3C4ACd058902A5845', usdPlus.address, 'sAMM-USDT/USD+', dex));
        items.push(createSkim('0x7F74D8C2A0D0997695eA121A2155e2710a6D62dc', usdPlus.address, 'vAMM-USD+/THE', dex));

        items.push(createBribe('0x92573046BD4abA37d875eb45a0A1182ac63d5580', etsAlpha, 'sAMM-ETS Alpha/USD+', dex, '0xa5f7c96b4c92f0143d8617778f8592d54252dd4b'));
        items.push(createBribe('0x92573046BD4abA37d875eb45a0A1182ac63d5580', usdPlus.address, 'sAMM-ETS Alpha/USD+', dex, '0xa5f7c96b4c92f0143d8617778f8592d54252dd4b'));


        return items;
    }

    function wombat(){

        let dex = 'Wombat';

        let items = [];
        items.push(createSkim('0x88bEb144352BD3109c79076202Fac2bcEAb87117', usdPlus.address, 'LP-USD+', dex));
        items.push(createSkim('0xbd459E33307A4ae92fFFCb45C6893084CFC273B1', usdtPlus.address, 'LP-USDT+', dex));

        return items;

    }

};

module.exports.tags = ['SettingBscPayoutListener'];

