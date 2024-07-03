const { ethers } = require("hardhat");
const { getContract, getPrice, transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe, createCustom } = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {
    const payoutManager = await getContract("BasePayoutManager", 'base');
    const usdPlus = await getContract('UsdPlusToken', 'base');
    const daiPlus = await getContract('UsdPlusToken', 'base_dai');
    const usdcPlus = await getContract('UsdPlusToken', 'base_usdc');

    let items = [];
    items.push(...baseSwap());
    items.push(...swapBased());
    items.push(...alienBase());
    items.push(...aerodrome());
    items.push(...equalizer());
    items.push(...citadel());
    items.push(...curve());
    items.push(...extraFi());
    items.push(...pancakeswap());
    await (await payoutManager.addItems(items)).wait();

    console.log('BasePayoutManager setting done');

    function baseSwap() {

        let dex = 'BaseSwap';
        let to = '0xaf1823bacd8edda3b815180a61f8741fa4abc6dd';

        let items = [];
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function swapBased() {

        let dex = 'SwapBased';
        let to = '0x1d868A13E1938fF16deb69A4ee49e8891d6a0A16';

        let items = [];
        items.push(createSkimToWithFee('0x164Bc404c64FA426882D98dBcE9B10d5df656EeD', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x164Bc404c64FA426882D98dBcE9B10d5df656EeD', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x282f9231E5294E7354744df36461c21e0E68061C', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xc3cb7E40b78427078E2cb0c5dA0BF7A0650F89f8', usdPlus.address, 'USDC+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xc3cb7E40b78427078E2cb0c5dA0BF7A0650F89f8', usdcPlus.address, 'USDC+/USD+', dex, to, 20, COMMON.rewardWallet));
        return items;
    }

    function alienBase() {

        let dex = 'AlienBase';
        let to = '0x845e2f1336D686794f791203CA6733d51672F543';

        let items = [];
        items.push(createSkimToWithFee('0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0', usdPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x553666081db0a8fdB337560009932852059d589A', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function aerodrome() {

        let dex = 'Aerodrome';
        let items = [];
        items.push(createSkim('0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6', usdPlus.address, 'sAMM-DAI+/USD+', dex));
        items.push(createSkim('0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6', daiPlus.address, 'sAMM-DAI+/USD+', dex));
        items.push(createSkim('0x3CF04A380e54FA4eD31eA48acb9132EA35e2E8D9', usdPlus.address, 'vAMM-DAI+/USD+', dex));
        items.push(createSkim('0x3CF04A380e54FA4eD31eA48acb9132EA35e2E8D9', daiPlus.address, 'vAMM-DAI+/USD+', dex));
        items.push(createSkim('0x4a3636608d7Bc5776CB19Eb72cAa36EbB9Ea683B', usdPlus.address, 'sAMM-USD+/USDbC', dex));
        items.push(createSkim('0x418457Ca08fA5EC77f811B105F2c585cd051Ac10', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createBribeWithFee('0x607363389331f4B2D1b955d009506A67c565D75E', usdPlus.address, 'vAMM-USD+/stERN', dex, '0x6CEd86715f74ff109ea7f908eAc78AF4ab2f41ea', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xc3B5ac236fb5AbE245310FeCa2526F89667D4CAe', usdPlus.address, 'vAMM-YFX/USD+', dex, '0x9a0efa1968837474e23c73b60f29d705d2eb8789', 20, COMMON.rewardWallet));
        items.push(createSkim('0x61366A4e6b1DB1b85DD701f2f4BFa275EF271197', usdPlus.address, 'vAMM-OVN/USD+', dex));
        items.push(createSkim('0xE96c788E66a97Cf455f46C5b27786191fD3bC50B', usdPlus.address, 'USDC+/USD+', dex));
        items.push(createSkim('0xE96c788E66a97Cf455f46C5b27786191fD3bC50B', usdcPlus.address, 'USDC+/USD+', dex));
        items.push(createSkim('0x08B935148AB10d3699Cb8d944519e8213abE6f1D', usdPlus.address, 'WETH/USD+', dex));
        items.push(createSkim('0x952388d73EA3E940eD6824DBd75ed6aD58e6B436', usdPlus.address, 'vAMM-DOLA/USD+ ', dex));
        items.push(createSkim('0x8E9154AC849e839d60299E85156bcb589De2693A', usdPlus.address, 'sAMM-DOLA/USD+', dex));
        items.push(createSkim('0x267d950110D9ED57999c3451b89C35a9D278C074', usdPlus.address, 'AERO/USD+', dex));
        items.push(createSkimToWithFee('0xAecAc8bDcf5c3dC2Bb66e9a12D25CA7f9D7d8279', usdPlus.address, 'vAMM-FLY/USD+', dex, '0x4F11A6cBb01938daD8CBF531352627342960cA58', 20, COMMON.rewardWallet));
        items.push(createSkim('0xAB6BcA0c78594Db0647036216DfF15b268Fd102F', usdPlus.address, 'vAMM-DOG/USD+', dex));
        items.push(createSkim('0xf15B30a0a823f588B523fD794A43939F0B1dC582', usdPlus.address, 'vAMM-USD+/wstETH', dex));
        items.push(createSkim('0x8041e2A135D2da7A8E21E4B14113D8245EC532e1', usdPlus.address, 'sAMM-USD+/eUSD', dex));
        items.push(createSkim('0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606', usdPlus.address, 'CL100-WETH/USD+', dex));
        items.push(createSkim('0x0c1A09d5D0445047DA3Ab4994262b22404288A3B', usdPlus.address, 'CL1-USDC/USD+', dex));
        items.push(createSkim('0xbB38EeBd670A9F3cafe6D3170862ccD930cB25f9', usdPlus.address, 'vAMM-USD+/sFRAX', dex));
        items.push(createSkimToWithFee('0x4Ef1E503C4F1e5664ac98294d0e42ddC9c0FF961', usdPlus.address, 'CL1-USDz/USD+', dex, '0xDeAF42D4a2CC1Dc14505Ce4E4f59629aeC253d75', 90, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x6f8e210030f6eE6933b032628a0e148a1CcfF6a6', usdPlus.address, 'CL200-TKN/USD+', dex, '0xee79A6F7aB51f6c660c06dA26ff93095B5Da83Ab', 10, '0xDeAF42D4a2CC1Dc14505Ce4E4f59629aeC253d75'));
        items.push(createSkim('0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD', usdPlus.address, 'CL1-DOLA/USD+', dex));
        items.push(createSkim('0x20086910E220D5f4c9695B784d304A72a0de403B', usdPlus.address, 'CL1-USD+/USDbC', dex));
        items.push(createSkim('0x8e62bE92c6Fb091428d0d6cBa0C0e32529B27e51', usdPlus.address, 'CL50-USD+/sFRAX', dex));
        items.push(createSkim('0x8e62bE92c6Fb091428d0d6cBa0C0e32529B27e51', usdPlus.address, 'CL50-USD+/sFRAX', dex));
        items.push(createSkim('0x9EfdF5b3E05e52c2957BDA3e89Ea35C5296A78f0', usdPlus.address, 'CL50-USD+/eUSD', dex));
        items.push(createSkim('0xa01A2513E95263b9BaCe60B573ce874E1e7a5246', usdPlus.address, 'CL200-USD+/wstETH', dex));
        items.push(createSkim('0xa19acc3B4f11c46c2b1Fc36B5f592AF422Ee338c', usdPlus.address, 'CL200-DEGEN/USD+', dex));
        
        return items;
    }

    function equalizer() {

        let dex = 'Equalizer';

        let items = [];
        items.push(createBribe('0xe9a5452aC188079cE00707C2b1076A1a58e80b18', usdPlus.address, 'USD+/USDbC', dex, '0x9820A0df5b2396D7e9aF58977166F6062F9c7Ce3'));
        items.push(createBribe('0x56863cbF405d97b4B89aa9ff1eC1f38E80126010', usdcPlus.address, 'USDC+/USDC', dex, '0x1D477a2b5Fb30ccE07D31ac3Bb624a820e0d14cb'));
        items.push(createBribe('0x48498571dF1B94d08C0C100f068938A7B1B525eE', usdcPlus.address, 'USDC+/USD+', dex, '0xf1F7605783127F34ae70A4DBE93396BB0f8b691c'));
        items.push(createBribe('0x48498571dF1B94d08C0C100f068938A7B1B525eE', usdPlus.address, 'USDC+/USD+', dex, '0xf1F7605783127F34ae70A4DBE93396BB0f8b691c'));

        return items;
    }

    function citadel() {

        let dex = 'Citadel';
        let to = '0xf682B446eCa10af937381e5b915C193f175ab959';

        let items = [];
        items.push(createSkimToWithFee('0x3F50De34Cf2E72d173a018A18eDF935bC03D43c7', daiPlus.address, 'DAI+/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x3F50De34Cf2E72d173a018A18eDF935bC03D43c7', usdPlus.address, 'USD+/USDbC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function curve() {

        let dex = 'Curve';

        let items = [];
        items.push(createSkim('0xda3de145054ED30Ee937865D31B500505C4bDfe7', usdPlus.address, 'USD+crvUSD-f', dex));
        return items;
    }

    function extraFi() {

        let dex = 'Extra.fi';
        let to = '0x89F0885DA2553232aeEf201692F8C97E24715c83';
        let fee = 20;

        let items = [];
        items.push(createSkimToWithFee('0x88F6e275dD40250782ff48c9b561C8a875934043', usdPlus.address, 'USD+/OVN', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x3510db57b98866b40dd5d913a73a0117fb6014f0', usdPlus.address, 'USD+ lendpool 1', dex, to, fee, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x2546fe1f2ca9a31ebed04035eba7c4544bff2745', usdPlus.address, 'USD+ lendpool 1', dex, to, fee, COMMON.rewardWallet));
        return items;
    }

    function pancakeswap() {

        let dex = 'PancakeSwap';

        let items = [];
        items.push(createSkim('0x5b9FEB72588D2800892a00d2abB4ca9071df846e', usdPlus.address, 'USD+/WETH', dex));
        items.push(createSkim('0xa4846201E94D2a5399774926f760A36D52Ac22BF', usdPlus.address, 'wstETH/USD+', dex));
        items.push(createSkim('0x40C91EBd1FA940A363989aC80a31B3a988dD649B', usdPlus.address, 'USD+/cbETH', dex));
        items.push(createSkim('0x98Ee8cd99370Ab19F18Fb9033337995076867ee9', usdPlus.address, 'USD+/BRETT', dex));
        items.push(createSkim('0xdd5AC923f03a97FF9F0cfbFa0F5E155E46c3727d', usdPlus.address, 'USD+/DEGEN', dex));
        items.push(createSkim('0x62996340a9bFEeE2A72bfAE8F21b8c0A5E692261', usdPlus.address, 'USD+/AERO', dex));


        return items;
    }
};

module.exports.tags = ['SettingBasePayoutManager'];

