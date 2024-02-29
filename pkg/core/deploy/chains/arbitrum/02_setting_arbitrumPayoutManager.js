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

    items.push(...wombat());
    items.push(...chronos());
    items.push(...curve());
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
        items.push(createSkim('0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb', usdPlus.address, 'USD+/USDC', dex));
        items.push(createSkim('0x8a06339Abd7499Af755DF585738ebf43D5D62B94', usdPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x8a06339Abd7499Af755DF585738ebf43D5D62B94', usdtPlus.address, 'USD+/USDT+', dex));
        items.push(createSkim('0x35D85D531BE7159cB6f92E8B9CeaF04eC28c6ad9', usdPlus.address, 'USD+/USDV', dex));


        return items;
    }

    function curve() {

        let dex = 'Curve';

        let items = [];
        items.push(createSkim('0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013', usdPlus.address, 'USD+/FRAX', dex));
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
        items.push(createSkim('0x0D20EF7033b73Ea0c9c320304B05da82E2C14E33', usdPlus.address, 'FRAX/USD+', dex));

        return items;
    }

};

module.exports.tags = ['SettingArbitrumPayoutManager'];

