const { ethers } = require("hardhat");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe,
    createCustom
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const payoutManager = await getContract("ArbitrumPayoutManager", 'arbitrum');
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
    items.push(...horiza());
    items.push(...pancakeswap());
    await (await payoutManager.addItems(items)).wait();

    console.log('ArbitrumPayoutManager setting done');

    function pancakeswap() {

        let dex = 'PancakeSwap';

        let items = [];
        items.push(createSkim('0xdAA80a051E22A7f7b0cfC33Aa29572fbDE65183E', ethPlus.address, 'WETH/ETH+', dex));
        items.push(createSkim('0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F', usdtPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x06c75011479E47280e8B7E72E9e0315C8b3A634d', ethPlus.address, 'USD+/ETH+', dex));
        items.push(createSkim('0x06c75011479E47280e8B7E72E9e0315C8b3A634d', usdPlus.address, 'USD+/ETH+', dex));
        items.push(createSkim('0xd01075f7314a6436e8B74fc18069848229D0c555', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0x714d48cb99b87f274b33a89fbb16ead191b40b6c', usdPlus.address, 'OVN/USD+', dex));

        return items;
    }

    function horiza() {

        let dex = 'Horiza';

        let items = [];
        items.push(createSkim('0xcc78afeCe206D8432e687294F038B7dea1046B40', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0xC12f901EffFE113252d0Fe2478F62E9F0f87E2d3', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0xC12f901EffFE113252d0Fe2478F62E9F0f87E2d3', usdtPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x499107966Cfc82f8926aBA4cE71bbfD0Cc766432', usdPlus.address, 'USD+/ETH+', dex));
        items.push(createSkim('0x499107966Cfc82f8926aBA4cE71bbfD0Cc766432', ethPlus.address, 'USD+/ETH+', dex));

        return items;
    }

    function coffeefi() {

        let dex = 'coffeefi';

        let items = [];
        items.push(createSkim('0x6cBEe1626349FfeeFa54228b79E9D44a003A3d24', usdPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x6cBEe1626349FfeeFa54228b79E9D44a003A3d24', daiPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x4a7d18f754D44f4325ae3Bb99200ff0C81DEa371', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0xdBC1c434ee311a12c0147bA72B0012B82AC92D67', usdPlus.address, 'USD+/OVN', dex));
        items.push(createSkim('0x18c1900824Bbd5e79d4054F8c382E75194a8D4bA', ethPlus.address, 'WETH/ETH+', dex));

        return items;
    }

    function curve() {

        let dex = 'Curve';

        let items = [];
        items.push(createSkim('0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013', usdPlus.address, 'USD+/FRAX', dex));
        return items;
    }

    function shekelswap() {

        let dex = 'ShekelSwap';
        let to = '0xa8866C8E6B0aC5EB38137371aADC4Fa9aeE5d08a';

        let items = [];
        items.push(createSkimToWithFee('0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315', daiPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x77cA2ddfd61D1D5E5d709cF07549FEC3E2d80315', usdPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x0627DCDCA49d749583c6a00327eb5E3846E265D3', usdPlus.address, 'USD+/USDC', dex, to, 20, COMMON.rewardWallet));

        return items;
    }


    function wombat() {

        let dex = 'Wombat';

        let items = [];
        items.push(createSkim('0xBd7568d25338940ba212e3F299D2cCC138fA35F0', usdPlus.address, 'LP-USD+', dex));

        return items;
    }

    function chronos() {

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

