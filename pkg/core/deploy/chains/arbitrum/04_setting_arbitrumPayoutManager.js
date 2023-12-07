const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe,
    createCustom
} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("ArbitrumPayoutManager", 'arbitrum');
    const usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    const usdtPlus = await getContract('UsdPlusToken', 'arbitrum_usdt');
    const ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');
    const daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let items = [];

    items.push(...shekelswap());
    items.push(...auragi());
    items.push(...wombat());
    items.push(...chronos());
    items.push(...solidlizard());
    items.push(...sterling());
    items.push(...ramses());
    items.push(...arbidex());
    items.push(...magicFox());

    await (await pl.addItems(items)).wait();


    console.log('ArbitrumPayoutManager setting done');

    function shekelswap(){

        let dex = 'ShekelSwap';
        let to = '0xa8866C8E6B0aC5EB38137371aADC4Fa9aeE5d08a';

        let items = [];
        items.push(createSkimToWithFee('0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315', daiPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function auragi(){

        let dex = 'Auragi';

        let items = [];
        items.push(createSkim('0x60a3bbec81a92e8894ed112a148dfcc98f577ba1', daiPlus.address, 'USD+/DAI+', dex));

        return items;

    }

    function wombat(){

        let dex = 'Wombat';

        let items = [];
        items.push(createSkimTo('0x51E073D92b0c226F7B0065909440b18A85769606', daiPlus.address, 'LP-DAI+', dex, '0x71081021ff37D38Dec956386EA5E467e58714951'));

        return items;

    }

    function chronos(){

        let dex = 'Chronos';

        let items = [];
        items.push(createSkim('0xB260163158311596Ea88a700C5a30f101D072326', daiPlus.address, 'USD+/DAI+', dex));

        return items;

    }


    function solidlizard() {

        let dex = 'SolidLizard';

        let items = [];
        items.push(createSkim('0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;
    }

    function sterling() {

        let dex = 'Sterling';

        let items = [];

        items.push(createSkim('0x58C1b1d1DD5e27E929ab159f485E9625ca24969C', daiPlus.address, 'sAMM-DAI/DAI+', dex));
        items.push(createSkim('0xB6490141901FE1a16af2ADA782BA897999683757', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;

    }

    function ramses() {

        let dex = 'Ramses';

        let items = [];

        items.push(createSkim('0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;
    }

    function arbidex() {

        let dex = 'Arbidex';
        let to = '0xE8FFE751deA181025a9ACf3D6Bde8cdA5380F53F';

        let items = [];

        items.push(createSkimToWithFee('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', daiPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xeE5e74Dc56594d070E0827ec270F974A68EBAF22', daiPlus.address, 'DAI/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x306132b6147751B85E608B4C1EC452E111531eA2', daiPlus.address, 'FRAX/DAI+', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function magicFox() {

        let dex = 'MagicFox';

        let items = [];

        items.push(createSkim('0xb5218593C5d7fcdb4Ae0C11B30d9181dfE010bBD', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;
    }



};

module.exports.tags = ['SettingArbitrumPayoutManager'];

