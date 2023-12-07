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
    items.push(...wombat());
    items.push(...chronos());
    items.push(...ramses());
    items.push(...arbidex());
    items.push(...curve());
    items.push(...coffeefi());

    await (await pl.removeItems()).wait();
    await (await pl.addItems(items)).wait();


    console.log('ArbitrumPayoutManager setting done');

    function coffeefi(){

        let dex = 'coffeefi';

        let items = [];
        items.push(createSkim('0x6cBEe1626349FfeeFa54228b79E9D44a003A3d24', usdPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x6cBEe1626349FfeeFa54228b79E9D44a003A3d24', daiPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x4a7d18f754D44f4325ae3Bb99200ff0C81DEa371', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0xdBC1c434ee311a12c0147bA72B0012B82AC92D67', usdPlus.address, 'USD+/OVN', dex));
        items.push(createSkim('0x18c1900824Bbd5e79d4054F8c382E75194a8D4bA', ethPlus.address, 'WETH/ETH+', dex));

        return items;
    }

    function curve(){

        let dex = 'Curve';

        let items = [];
        items.push(createSkim('0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013', usdPlus.address, 'USD+/FRAX', dex));
        return items;

    }

    function shekelswap(){

        let dex = 'ShekelSwap';
        let to = '0xa8866C8E6B0aC5EB38137371aADC4Fa9aeE5d08a';

        let items = [];
        items.push(createSkimToWithFee('0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315', daiPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315', usdPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x0627DCDCA49d749583c6a00327eb5E3846E265D3', usdPlus.address, 'USD+/USDC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }


    function wombat(){

        let dex = 'Wombat';

        let items = [];
        items.push(createSkim('0xBd7568d25338940ba212e3F299D2cCC138fA35F0', usdPlus.address, 'LP-USD+', dex));

        return items;

    }

    function chronos(){

        let dex = 'Chronos';

        let items = [];
        items.push(createSkim('0xBbD7fF1728963A5Eb582d26ea90290F84E89bd66', usdPlus.address, 'DOLA/USD+', dex));
        items.push(createSkim('0xcd78e225E36E724c9FB4Bd8287296557D728cda7', usdPlus.address, 'LUSD/USD+', dex));
        items.push(createSkim('0x0D20EF7033b73Ea0c9c320304B05da82E2C14E33', usdPlus.address, 'FRAX/USD+', dex));
        items.push(createSkim('0xB260163158311596Ea88a700C5a30f101D072326', usdPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0xB260163158311596Ea88a700C5a30f101D072326', daiPlus.address, 'USD+/DAI+', dex));

        return items;

    }


    function ramses() {

        let dex = 'Ramses';

        let items = [];

        items.push(createSkim('0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;
    }

    function arbidex() {

        let dex = 'Arbidex';

        let items = [];

        items.push(createSkim('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', usdPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', daiPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0xECe52B1fc32D2B4f22eb45238210b470a64bfDd5', usdPlus.address, 'USD+/USDC', dex));

        return items;
    }




};

module.exports.tags = ['SettingArbitrumPayoutManager'];

