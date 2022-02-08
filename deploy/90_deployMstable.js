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


    await setWeights(addresses, values, abis);
    await setPriceGetters(addresses, values, abis);
    await setPm(addresses, values, abis);
    await setVault(addresses, values, abis);

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal #11 Add MStable "),
    );

    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal ID ' + proposalId)

};

async function setVault(addresses, values, abis){


    const vault = await ethers.getContract("Vault");
    const connectorMStable = await ethers.getContract("ConnectorMStable");

    addresses.push(vault.address);
    addresses.push(vault.address);

    values.push(0);
    values.push(0);

    abis.push(vault.interface.encodeFunctionData('setVimUsdToken', [assets.vimUsd]))
    abis.push(vault.interface.encodeFunctionData('setConnectorMStable', [connectorMStable.address]));

}

async function setPm(addresses, values, abis){


    const pm = await ethers.getContract("PortfolioManager");
    const connectorMStable = await ethers.getContract("ConnectorMStable");

    addresses.push(pm.address);
    addresses.push(pm.address);
    addresses.push(pm.address);
    addresses.push(pm.address);

    values.push(0);
    values.push(0);
    values.push(0);
    values.push(0);

    abis.push(pm.interface.encodeFunctionData('setVimUsdToken', [assets.vimUsd]))
    abis.push(pm.interface.encodeFunctionData('setImUsdToken', [assets.imUsd]))
    abis.push(pm.interface.encodeFunctionData('setUsdcToken', [assets.usdc]))
    abis.push(pm.interface.encodeFunctionData('setConnectorMStable', [connectorMStable.address]))

}

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


    const portfolio = await ethers.getContract("Portfolio");

    let vimUsdWeight = {
        asset: assets.vimUsd,
        minWeight: 0,
        targetWeight: 60000,
        maxWeight: 100000,
    }
    let idleUsdcWeight = {
        asset: assets.idleUsdc,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let usdcWeight = {
        asset: assets.usdc,
        minWeight: 0,
        targetWeight: 1000,
        maxWeight: 100000,
    }
    let aUsdcWeight = {
        asset: assets.amUsdc,
        minWeight: 0,
        targetWeight: 1000,
        maxWeight: 100000,
    }
    let a3CrvWeight = {
        asset: assets.am3CRV,
        minWeight: 0,
        targetWeight: 1000,
        maxWeight: 100000,
    }
    let a3CrvGaugeWeight = {
        asset: assets.am3CRVgauge,
        minWeight: 0,
        targetWeight: 37000,
        maxWeight: 100000,
    }
    let wMaticWeight = {
        asset: assets.wMatic,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let crvWeight = {
        asset: assets.crv,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let mtaWeight = {
        asset: assets.mta,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let weights = [
        vimUsdWeight,
        idleUsdcWeight,
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight,
        crvWeight,
        mtaWeight
    ]


    addresses.push(portfolio.address);
    values.push(0);
    abis.push(portfolio.interface.encodeFunctionData('setWeights', [weights]));
}


async function upgradeTo(addresses, values, abis, name, newAddress){

    const contract= await ethers.getContract(name);

    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData('upgradeTo', [newAddress]));
}

module.exports.tags = ['deployMstable'];


