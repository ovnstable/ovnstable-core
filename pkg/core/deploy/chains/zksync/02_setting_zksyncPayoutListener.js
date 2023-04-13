const {ethers} = require("hardhat");

let {BSC, COMMON} = require('@overnight-contracts/common/utils/assets');
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe, createSkimTo} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({getNamedAccounts, deployments}) => {


    const pl = await getContract("ZksyncPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'zksync');

    let items = [];

    items.push(...velocore());

    await (await pl.addItems(items)).wait();

    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'zksync')).address)).wait();

    console.log('ZksyncPayoutListener setting done');

    function velocore(){

        let dex = 'Velocore';

        let items = [];
        items.push(createBribe('0x4b9f00860d7f42870addeb687fa4e47062df71d9', usdPlus.address, 'USDC/USD+', dex, '0x691e8644Efc7FDad4e502c9370eF5F43af34C647'));

        return items;
    }




};

module.exports.tags = ['SettingZksyncPayoutListener'];

