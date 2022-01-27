const {ethers} = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const timelockController = await ethers.getContract("TimelockController");
    const governor = await ethers.getContract("OvnGovernor");

    let addresses = [];
    let values = [];
    let abis = [];


    let contracts = JSON.parse(fs.readFileSync("impls_4.json", 'utf8'));

    for (let i = 0; i < contracts.length; i++) {
        let contract = contracts[i];
        await upgradeTo(addresses, values, abis, contract.contractName, contract.address);
    }


    await setWeights(addresses, values, abis);
    await setPriceGetters(addresses, values, abis);

    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal Add MStable"),
    );


};

async function setPriceGetters(addresses, values, abis){

    const idleUsdcPriceGetter = await ethers.getContract('IdleUsdcPriceGetter');
    const usdcPriceGetter = await ethers.getContract('UsdcPriceGetter');
    const aUsdcPriceGetter = await ethers.getContract('AUsdcPriceGetter');
    const a3CrvPriceGetter = await ethers.getContract('A3CrvPriceGetter');
    const a3CrvGaugePriceGetter = await ethers.getContract('A3CrvGaugePriceGetter');
    const crvPriceGetter = await ethers.getContract('CrvPriceGetter');
    const wMaticPriceGetter = await ethers.getContract('WMaticPriceGetter');
    const vimUsdPriceGetter = await ethers.getContract('VimUsdPriceGetter');
    const mtaPriceGetter = await ethers.getContract('MtaPriceGetter');

    const portfolio = await ethers.getContract('Portfolio');


    let idleUsdcAssetInfo = {
        asset: assets.idleUsdc,
        priceGetter: idleUsdcPriceGetter.address
    }
    let usdcAssetInfo = {
        asset: assets.usdc,
        priceGetter: usdcPriceGetter.address
    }
    let aUsdcAssetInfo = {
        asset: assets.amUsdc,
        priceGetter: aUsdcPriceGetter.address
    }
    let a3CrvAssetInfo = {
        asset: assets.am3CRV,
        priceGetter: a3CrvPriceGetter.address
    }
    let a3CrvGaugeAssetInfo = {
        asset: assets.am3CRVgauge,
        priceGetter: a3CrvGaugePriceGetter.address
    }
    let crvAssetInfo = {
        asset: assets.crv,
        priceGetter: crvPriceGetter.address
    }
    let wMaticAssetInfo = {
        asset: assets.wMatic,
        priceGetter: wMaticPriceGetter.address
    }
    let vimUsdAssetInfo = {
        asset: assets.vimUsd,
        priceGetter: vimUsdPriceGetter.address
    }
    let mtaAssetInfo = {
        asset: assets.mta,
        priceGetter: mtaPriceGetter.address
    }
    let assetInfos = [
        usdcAssetInfo,
        aUsdcAssetInfo,
        a3CrvAssetInfo,
        a3CrvGaugeAssetInfo,
        crvAssetInfo,
        wMaticAssetInfo,
        idleUsdcAssetInfo,
        vimUsdAssetInfo,
        mtaAssetInfo
    ]

    addresses.push(portfolio.address);
    values.push(0);
    abis.push(portfolio.interface.encodeFunctionData('setAssetInfos', [assetInfos]));

}

async function setWeights(addresses, values, abis){
    const balancer = await ethers.getContract("Balancer");

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('Usdc2VimUsdActionBuilder')).address, 0]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('Usdc2IdleUsdcActionBuilder')).address, 1]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('Usdc2AUsdcActionBuilder')).address, 2]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder')).address, 3]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder')).address, 3]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('AUsdc2A3CrvActionBuilder')).address, 4]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('WMatic2UsdcActionBuilder')).address, 5]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('Crv2UsdcActionBuilder')).address, 6]));

    addresses.push(balancer.address);
    values.push(0);
    abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [(await ethers.getContract('Mta2UsdcActionBuilder')).address, 7]));
}


async function upgradeTo(addresses, values, abis, name, newAddress){

    const contract= await ethers.getContract(name);

    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData('upgradeTo', [newAddress]));
}

module.exports.tags = ['deployMstable'];


