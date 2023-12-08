let {COMMON} = require('@overnight-contracts/common/utils/assets');
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {
    createSkim,
    createCustomBribe
} = require("@overnight-contracts/common/utils/payoutListener");

module.exports = async ({getNamedAccounts, deployments}) => {

    const pl = await getContract("BscPayoutManager", 'bsc');

    let usdPlus = await getContract('UsdPlusToken', 'bsc');
    let usdtPlus = await getContract('UsdPlusToken', 'bsc_usdt');

    let items = [];

    items.push(...thena());
    items.push(...wombat());

    await (await pl.addItems(items)).wait();

    console.log('BscPayoutManager setting done');

    function thena() {

        let dex = 'Thena';
        let bribe = '0xBaA1a776d49a03f451fA5156aAB73EFd0b97618B'; // OVN/USDT+

        let items = [];

        items.push(createCustomBribe('0x1561D9618dB2Dcfe954f5D51f4381fa99C8E5689', usdPlus.address, 'sAMM-USDT+/USD+', dex, bribe, COMMON.rewardWallet, 0));
        items.push(createCustomBribe('0x1561D9618dB2Dcfe954f5D51f4381fa99C8E5689', usdtPlus.address, 'sAMM-USDT+/USD+', dex, bribe, COMMON.rewardWallet, 0));
        items.push(createCustomBribe('0x1F3cA66c98d682fA1BeC31264692daD4f17340BC', usdPlus.address, 'sAMM-HAY/USD+', dex, bribe, COMMON.rewardWallet, 0));
        items.push(createCustomBribe('0x0571e491cBfa2FDb449a329196e01E4fDC9cAF7A', usdtPlus.address, 'vAMM-OVN/USDT+', dex, bribe, COMMON.rewardWallet, 0));

        return items;
    }

    function wombat() {

        let dex = 'Wombat';

        let items = [];

        items.push(createSkim('0x88bEb144352BD3109c79076202Fac2bcEAb87117', usdPlus.address, 'LP-USD+', dex));
        items.push(createSkim('0xbd459E33307A4ae92fFFCb45C6893084CFC273B1', usdtPlus.address, 'LP-USDT+', dex));

        return items;
    }

};

module.exports.tags = ['SettingBscPayoutManager'];

