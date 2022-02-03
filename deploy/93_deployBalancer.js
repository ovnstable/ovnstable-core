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

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal #15 Add Balancer"),
    );

    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal ID ' + proposalId)

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
    const bpspTUsdPriceGetter = await ethers.getContract('BpspTUsdPriceGetter');
    const tUsdPriceGetter = await ethers.getContract('TUsdPriceGetter');
    const balPriceGetter = await ethers.getContract('BalPriceGetter');

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
    let bpspTUsdAssetInfo = {
        asset: assets.bpspTUsd,
        priceGetter: bpspTUsdPriceGetter.address
    }
    let tUsdAssetInfo = {
        asset: assets.tUsd,
        priceGetter: tUsdPriceGetter.address
    }
    let balAssetInfo = {
        asset: assets.bal,
        priceGetter: balPriceGetter.address
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
        mtaAssetInfo,
        bpspTUsdAssetInfo,
        tUsdAssetInfo,
        balAssetInfo,
    ]

    addresses.push(portfolio.address);
    values.push(0);
    abis.push(portfolio.interface.encodeFunctionData('setAssetInfos', [assetInfos]));

}

async function setWeights(addresses, values, abis){
    const balancer = await ethers.getContract("Balancer");


    let builders = [];
    builders.push('Usdc2VimUsdActionBuilder');
    builders.push('Usdc2IdleUsdcActionBuilder');
    builders.push('Usdc2BpspTUsdActionBuilder');
    builders.push('Usdc2AUsdcActionBuilder');
    builders.push('A3Crv2A3CrvGaugeActionBuilder');
    builders.push('AUsdc2A3CrvActionBuilder');
    builders.push('WMatic2UsdcActionBuilder');
    builders.push('Crv2UsdcActionBuilder');
    builders.push('Mta2UsdcActionBuilder');
    builders.push('TUsd2UsdcActionBuilder');
    builders.push('Bal2UsdcActionBuilder');


    for (let i = 0; i <builders.length ; i++) {

        let builder = builders[i];
        let contract = await ethers.getContract(builder);

        addresses.push(balancer.address);
        values.push(0);
        abis.push(balancer.interface.encodeFunctionData('addActionBuilderAt', [contract.address, i]));
    }


    const portfolio = await ethers.getContract("Portfolio");

    let vimUsdWeight = {
        asset: assets.vimUsd,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
    }
    let idleUsdcWeight = {
        asset: assets.idleUsdc,
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
    }
    let bpspTUsdWeight = {
        asset: assets.bpspTUsd,
        minWeight: 0,
        targetWeight: 2000,
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
        targetWeight: 75000,
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
    let tUsdWeight = {
        asset: assets.tUsd,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let balWeight = {
        asset: assets.bal,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let weights = [
        vimUsdWeight,
        idleUsdcWeight,
        bpspTUsdWeight,
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight,
        crvWeight,
        mtaWeight,
        tUsdWeight,
        balWeight
    ]


    addresses.push(portfolio.address);
    values.push(0);
    abis.push(portfolio.interface.encodeFunctionData('setWeights', [weights]));
}



module.exports.tags = ['deployMstable'];


