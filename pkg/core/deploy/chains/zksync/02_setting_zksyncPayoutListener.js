const {ethers} = require("hardhat");

let {BSC, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe, createSkimTo, createCustom} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({getNamedAccounts, deployments}) => {


    const pl = await getContract("ZksyncPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'zksync');

    let items = [];

    // items.push(...velocore());
    // items.push(...syncSwap());
    items.push(...vesync());

    await (await pl.addItems(items)).wait();

    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'zksync')).address)).wait();

    console.log('ZksyncPayoutListener setting done');

    function vesync(){

        let dex = 'VeSync';

        let items = [];
        items.push(createSkim('0x16D0fC836FED0f645d832Eacc65106dDB67108Ef', usdPlus.address, 'USDC/USD+', dex));

        return items;
    }

    function velocore(){

        let dex = 'Velocore';

        let items = [];
        items.push(createBribe('0x4b9f00860d7f42870addeb687fa4e47062df71d9', usdPlus.address, 'USDC/USD+', dex, '0x691e8644Efc7FDad4e502c9370eF5F43af34C647'));

        return items;
    }


    function syncSwap(){

        let dex = 'SyncSwap';

        let items = [];
        items.push(createCustom('0x1996EcC218F6F5182732a34E92a2c6aB294DC350', usdPlus.address, 'All USD+', dex));

        return items;
    }




};

module.exports.tags = ['SettingZksyncPayoutListener'];

