const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;
const {expect} = require("chai");
const chai = require("chai");
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));


async function main() {

    let exchange = await ethers.getContract('Exchange');
    let vault = await ethers.getContract('Vault');
    const usdPlus = await ethers.getContract("UsdPlusToken");
    const m2m = await ethers.getContract("Mark2Market");
    const pm = await ethers.getContract("PortfolioManager");
    const portfolio = await ethers.getContract("Portfolio");
    const balancer = await ethers.getContract("Balancer");
    const rm = await ethers.getContract("RewardManager");
    const connMStable = await ethers.getContract("ConnectorMStable");
    const connAAVE = await ethers.getContract("ConnectorAAVE");
    const connCurve = await ethers.getContract("ConnectorCurve");
    const connIDLE = await ethers.getContract("ConnectorIDLE");

    const usdc2VimUsdTokenExchange = await ethers.getContract("Usdc2VimUsdTokenExchange");

    let admin = "0x6522C013a9e347BD0a271c6f95Ef6f919b6a0C51";
    let upgradeRole = "0x6522C013a9e347BD0a271c6f95Ef6f919b6a0C51";

    await checkExchange();
    await checkUsdPlusToken();
    await checkVault();

    await checkM2M();
    await checkPM();
    await checkConnectors();
    await checkBalancer();
    await checkRM();

    await checkAdminUpgrade();

    async function checkAdminUpgrade() {
        console.log('Check Admin, Upgrader Role ...')

        let contracts = [exchange, vault, pm, balancer, m2m, portfolio, rm];
        for (let i = 0; i < contracts.length; i++) {
            let contract = contracts[i];
            await checkSingleRule(contract, await contract.DEFAULT_ADMIN_ROLE(), admin);
            await checkSingleRule(contract, await contract.UPGRADER_ROLE(), upgradeRole);
        }

        console.log('Check Admin, Upgrader Role => done');

    }

    async function checkRM() {
        console.log('Check RM...');

        checkEqual(await rm.rewardGauge(), "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c");
        checkEqual(await rm.vault(), vault.address);
        checkEqual(await rm.aUsdc(), assets.amUsdc);

        console.log('Check RM => done');

    }

    async function checkBalancer() {
        console.log('Check Balancer...');

        checkEqual(await balancer.mark2market(), m2m.address);

        expect(await balancer.actionBuilders(0)).to.eq((await ethers.getContract('Usdc2VimUsdActionBuilder')).address);
        expect(await balancer.actionBuilders(1)).to.eq((await ethers.getContract('Usdc2IdleUsdcActionBuilder')).address);
        expect(await balancer.actionBuilders(2)).to.eq((await ethers.getContract('Usdc2AUsdcActionBuilder')).address);
        expect(await balancer.actionBuilders(3)).to.eq((await ethers.getContract('A3Crv2A3CrvGaugeActionBuilder')).address);
        expect(await balancer.actionBuilders(4)).to.eq((await ethers.getContract('AUsdc2A3CrvActionBuilder')).address);
        expect(await balancer.actionBuilders(5)).to.eq((await ethers.getContract('WMatic2UsdcActionBuilder')).address);
        expect(await balancer.actionBuilders(6)).to.eq((await ethers.getContract('Crv2UsdcActionBuilder')).address);
        expect(await balancer.actionBuilders(7)).to.eq((await ethers.getContract('Mta2UsdcActionBuilder')).address);

        console.log('Check Balancer => done');

    }

    async function checkConnectors() {

        console.log('Check Connectors...');

        checkEqual(await connAAVE.lpap(), "0xd05e3E715d945B59290df0ae8eF85c1BdB684744");
        checkEqual(await connCurve.pool(), "0x445FE580eF8d70FF569aB36e80c647af338db351");
        checkEqual(await connIDLE.idleToken(), "0x1ee6470CD75D5686d0b2b90C0305Fa46fb0C89A1");

        checkEqual(await connMStable.vault(), vault.address);
        checkEqual(await connMStable.mUsdToken(), assets.mUsd);
        checkEqual(await connMStable.imUsdToken(), assets.imUsd);
        checkEqual(await connMStable.vimUsdToken(), assets.vimUsd);
        checkEqual(await connMStable.mtaToken(), assets.mta);
        checkEqual(await connMStable.wMaticToken(), assets.wMatic);

        await checkSingleRule(connMStable, await connMStable.TOKEN_EXCHANGER(), usdc2VimUsdTokenExchange.address);
        await checkSingleRule(connMStable, await connMStable.PORTFOLIO_MANAGER(), pm.address);

        console.log('Check Connectors => done');

    }

    async function checkPM() {

        console.log('Check PM...');

        checkEqual(await pm.vault(), vault.address);
        checkEqual(await pm.balancer(), balancer.address);
        checkEqual(await pm.rewardManager(), rm.address);
        checkEqual(await pm.portfolio(), portfolio.address);
        checkEqual(await pm.vimUsdToken(), assets.vimUsd);
        checkEqual(await pm.imUsdToken(), assets.imUsd);
        checkEqual(await pm.usdcToken(), assets.usdc);
        checkEqual(await pm.connectorMStable(), connMStable.address);

        await checkSingleRule(pm, await pm.EXCHANGER(), exchange.address);

        console.log('Check PM => done');
    }

    async function checkM2M() {
        console.log('Check M2M...');

        checkEqual(await m2m.vault(), vault.address);
        checkEqual(await m2m.portfolio(), portfolio.address);

        console.log('Check M2M => done');

    }

    async function checkVault() {
        console.log('Check Vault...');

        checkEqual(await vault.aaveReward(), "0x357D51124f59836DeD84c8a1730D72B749d8BC23");
        checkEqual(await vault.vimUsdToken(), assets.vimUsd);

        await checkSingleRule(vault, await vault.CONNECTOR_MSTABLE(), connMStable.address);
        await checkSingleRule(vault, await vault.REWARD_MANAGER(), rm.address);
        await checkSingleRule(vault, await vault.PORTFOLIO_MANAGER(), pm.address);

        console.log('Check Vault => done')

    }

    async function checkUsdPlusToken() {
        console.log('Check UsdPlusToken...')

        await checkSingleRule(usdPlus, await usdPlus.EXCHANGER(), exchange.address);

        console.log('Check UsdPlusToken => done')
    }

    async function checkExchange() {
        console.log('Check Exchange...')
        checkEqual(await exchange.usdPlus(), usdPlus.address);
        checkEqual(await exchange.usdc(), assets.usdc);
        checkEqual(await exchange.portfolioManager(), pm.address);
        checkEqual(await exchange.mark2market(), m2m.address);
        console.log('Check Exchange => done')
    }

}


async function checkSingleRule(contract, role, account) {
    expect(await contract.hasRole(role, account)).to.true;
}

function checkEqual(value, equal) {
    expect(value.toUpperCase()).to.eq(equal.toUpperCase());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




