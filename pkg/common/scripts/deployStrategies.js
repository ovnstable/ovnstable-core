const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromOvnGov, toUSDC, fromUSDC} = require("../utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
let TimeLock = JSON.parse(fs.readFileSync('./deployments/polygon/TimelockController.json'));
let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let Portfolio = JSON.parse(fs.readFileSync('./deployments/polygon/Portfolio.json'));
let Mark2Market = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));
let OvnGovernor = JSON.parse(fs.readFileSync('./deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/OvnToken.json'));
let Vault = JSON.parse(fs.readFileSync('./deployments/polygon/Vault.json'));

let AAVE = JSON.parse(fs.readFileSync('./deployments/polygon_new/StrategyAave.json'));
let CURVE = JSON.parse(fs.readFileSync('./deployments/polygon_new/StrategyCurve.json'));
let MSTABLE = JSON.parse(fs.readFileSync('./deployments/polygon_new/StrategyMStable.json'));
let IZUMI = JSON.parse(fs.readFileSync('./deployments/polygon_new/StrategyIzumi.json'));
let M2M_NEW = JSON.parse(fs.readFileSync('./deployments/polygon_new/Mark2Market.json'));
let EXCHANGE_NEW = JSON.parse(fs.readFileSync('./deployments/polygon_new/Exchange.json'));
let PortfolioNew = JSON.parse(fs.readFileSync('./deployments/polygon_new/PortfolioManager.json'));


const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));



async function main() {

    let wallet = await initWallet();

    let governator = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let exchangeOld = await ethers.getContractAt(Exchange.abi, Exchange.address);
    let vault = await ethers.getContractAt(Vault.abi, Vault.address, wallet);
    let pmOld = await ethers.getContractAt(Portfolio.abi, Portfolio.address, wallet);
    let pmNew = await ethers.getContractAt(PortfolioNew.abi, PortfolioNew.address, wallet);
    let m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address, wallet);
    let m2mNew = await ethers.getContractAt(M2M_NEW.abi, M2M_NEW.address, wallet);
    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);
    const governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address);
    let usdc = await ethers.getContractAt(ERC20.abi, assets.usdc, wallet);
    let amUsdc = await ethers.getContractAt(ERC20.abi, assets.amUsdc, wallet);
    let am3CRV = await ethers.getContractAt(ERC20.abi, assets.am3CRV, wallet);
    let am3CRVgauge = await ethers.getContractAt(ERC20.abi, assets.am3CRVgauge, wallet);

    let aave = await ethers.getContractAt(AAVE.abi, AAVE.address, wallet);
    let curve = await ethers.getContractAt(CURVE.abi, CURVE.address, wallet);
    let exchangeNew = await ethers.getContractAt(EXCHANGE_NEW.abi, EXCHANGE_NEW.address, wallet);

    let addresses = [];
    let values = [];
    let abis = [];


    // await grantRole();
    // await checkGrantRole();
    // await redeem();
    // await showBalances(vault.address);
    // await transferVault();
    // await showBalances(vault.address);

    // await setStrategyWeights();
    await showM2MNew();


    console.log('Total supply : ' + await usdPlus.totalSupply() / 10 ** 6);
    // await buyNew();

    async function buyNew(){

        let tx =await exchangeNew.setTokens(usdPlus.address, assets.usdc, {
            maxFeePerGas: "250000000000",
            maxPriorityFeePerGas: "250000000000"
        });

        console.log(' maxPriorityFeePerGas : ' + tx.maxPriorityFeePerGas);
        console.log(' maxFeePerGas:  ' + tx.maxFeePerGas);
        console.log(' gasPrice:  ' + tx.gasPrice);

        await tx.wait();

        await (await pmNew.balance( {
            maxFeePerGas: "250000000000",
            maxPriorityFeePerGas: "250000000000"
        })).wait();
    }

    async function transferVault(){

        console.log(`Transfer USDC token ${assets.usdc} recepient: ${pmNew.address} balance: ${await usdc.balanceOf(vault.address)}`);
        console.log(`Transfer amUSDC token ${assets.amUsdc} recepient: ${aave.address} balance: ${await amUsdc.balanceOf(vault.address)}`);
        console.log(`Transfer am3CRV token ${assets.am3CRV} recepient: ${curve.address} balance: ${await am3CRV.balanceOf(vault.address)}`);
        console.log(`Transfer am3CRVgauge token ${assets.am3CRVgauge} recepient: ${curve.address} balance: ${await am3CRVgauge.balanceOf(vault.address)}`);

        await (await vault.transfer(assets.usdc, pmNew.address, await usdc.balanceOf(vault.address))).wait();

        console.log('Transfer amUSDC');
        await ( await vault.transfer(assets.amUsdc, aave.address, await amUsdc.balanceOf(vault.address))).wait();

        console.log('Transfer am3CRV');
        await (await vault.transfer(assets.am3CRV, curve.address, await am3CRV.balanceOf(vault.address))).wait();

        console.log('Transfer am3CRVgauge');
        await (await vault.transfer(assets.am3CRVgauge, curve.address, await am3CRVgauge.balanceOf(vault.address))).wait();
    }

    async function showM2MNew(){

        let items = await m2mNew.strategyAssets();

        console.log('Total net asset value: ' + await m2mNew.totalNetAssets());
        console.log('Total liq value: ' + await m2mNew.totalLiquidationAssets());

        for (let i = 0; i <items.length ; i++) {

            let item = items[i];
            console.log("Strategy: " + item.strategy);
            console.log("NetAsset: " + fromUSDC(item.netAssetValue));
            console.log("LiqValue: " + fromUSDC(item.liquidationValue));
        }
    }


    async function unstakeAave(){

        console.log('Balance USDC: ' + await usdc.balanceOf(wallet.address));
        await aave.setPortfolioManager(wallet.address);
        await aave.unstake(usdc.address, 0, wallet.address, true);
        console.log('Balance USDC: ' + await usdc.balanceOf(wallet.address));
    }

    async function grantRole(){

        let vimUsdWeight = {
            asset: assets.vimUsd,
            minWeight: 0,
            targetWeight: 0,
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
            targetWeight: 97000,
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

        addresses.push(pmOld.address);
        values.push(0);
        abis.push(pmOld.interface.encodeFunctionData('setWeights', [weights]));

        addresses.push(pmOld.address);
        values.push(0);
        abis.push(pmOld.interface.encodeFunctionData('grantRole', [await pmOld.DEFAULT_ADMIN_ROLE(), wallet.address]));

        addresses.push(vault.address);
        values.push(0);
        abis.push(vault.interface.encodeFunctionData('grantRole', [await vault.PORTFOLIO_MANAGER(), wallet.address]));

        addresses.push(usdPlus.address);
        values.push(0);
        abis.push(usdPlus.interface.encodeFunctionData('grantRole', [await usdPlus.EXCHANGER(), exchangeNew.address]))

        // addresses.push(usdPlus.address);
        // values.push(0);
        // abis.push(usdPlus.interface.encodeFunctionData('revokeRole', [await usdPlus.EXCHANGER(), exchangeOld.address]))

        console.log('Creating a proposal...')
        const proposeTx = await governor.proposeExec(
            addresses,
            values,
            abis,
            ethers.utils.id("Proposal #22 New core"),
        );

        console.log('Tx ' + proposeTx.hash);
        let tx = await proposeTx.wait();
        const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

        console.log('Proposal id ' + proposalId);
        // await execProposal(governator, ovn, proposalId, wallet);

    }


    async function redeem(){

        //
        console.log('Approve');
        await(await usdc.approve(exchangeOld.address, toUSDC(1))).wait();

        console.log('Buy');
        await  (await exchangeOld.buy(usdc.address, toUSDC(1))).wait();

    }

    async function setStrategyWeights(){

        let aave = {
            strategy: AAVE.address,
            minWeight: 0,
            targetWeight: 100000,
            maxWeight: 100000,
            enabled: true,
            enabledReward: true,
        }
        let curve = {
            strategy: CURVE.address,
            minWeight: 0,
            targetWeight: 0,
            maxWeight: 100000,
            enabled: false,
            enabledReward: true,
        }

        let mstable= {
            strategy: MSTABLE.address,
            minWeight: 0,
            targetWeight: 0,
            maxWeight: 100000,
            enabled: true,
            enabledReward: true,
        }

        let izumu = {
            strategy: IZUMI.address,
            minWeight: 0,
            targetWeight: 0,
            maxWeight: 100000,
            enabled: true,
            enabledReward: true,
        }

        let weights = [
            aave,
            mstable,
            izumu,
            // balancer,
            curve,
            // idle
        ]

        await (await pmNew.setStrategyWeights(weights)).wait();
        await (await pmNew.balance()).wait();

    }

    async function checkGrantRole(){

        console.log(`pmOld.hasRoleAdmin() => ${await pmOld.hasRole(await pmOld.DEFAULT_ADMIN_ROLE(), wallet.address)}`)
        console.log(`vault.hasRolePM() => ${await vault.hasRole(await vault.PORTFOLIO_MANAGER(), wallet.address)}`)
        console.log(`usdPlus[${usdPlus.address}].hasRoleEXCHANGER() - NEW ${exchangeNew.address} => ${await usdPlus.hasRole(await usdPlus.EXCHANGER(), exchangeNew.address)}`)
        console.log(`usdPlus[${usdPlus.address}].hasRoleEXCHANGER() - OLD ${exchangeOld.address}=> ${await usdPlus.hasRole(await usdPlus.EXCHANGER(), exchangeOld.address)}`)

    }
}




async function initWallet() {

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);

    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance));

    return wallet;
}

async function execProposal(governator, ovn, id, wallet) {

    let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber('polygon') - 1));
    console.log('Quorum: ' + quorum);

    const proposalId = id;

    let votes = ethers.utils.parseUnits("100000100", 9);

    let state = proposalStates[await governator.state(proposalId)];
    if (state === "Executed") {
        return;
    }

    console.log('State status: ' + state)
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting

    console.log('Votes: ' + votes)
    await governator.castVote(proposalId, 1);

    let item = await governator.proposals(proposalId);
    console.log('Votes for: ' + item.forVotes / 10 ** 18);

    let total = fromOvnGov(await ovn.getVotes(wallet.address));
    console.log('Delegated ' + total)

    let waitBlock = 200;
    const sevenDays = 7 * 24 * 60 * 60;
    for (let i = 0; i < waitBlock; i++) {
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    }

    state = proposalStates[await governator.state(proposalId)];
    expect(state).to.eq('Succeeded');
    await governator.queueExec(proposalId);
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    await governator.executeExec(proposalId);


    state = proposalStates[await governator.state(proposalId)];
    console.log('State status: ' + state)
    expect(state).to.eq('Executed');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

async function showBalances( ownerAddress) {

    let m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address );

    let prices = await m2m.assetPrices();
   console.log('TotalUSDC: ' + fromE18(prices.totalUsdcPrice));

    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x625E7708f30cA75bfd92586e17077590C60eb4cD');
    let am3CRV = await ethers.getContractAt(ERC20.abi, '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi, '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi, '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
    let wmatic = await ethers.getContractAt(ERC20.abi, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let vimUsd = await ethers.getContractAt(ERC20.abi, '0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29');
    let mta = await ethers.getContractAt(ERC20.abi, '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0');
    let bpspTUsd = await ethers.getContractAt(ERC20.abi, '0x0d34e5dD4D8f043557145598E4e2dC286B35FD4f');
    let tUsd = await ethers.getContractAt(ERC20.abi, '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756');
    let bal = await ethers.getContractAt(ERC20.abi, '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, vimUsd, mta, bpspTUsd, tUsd, bal];

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(ownerAddress) / 10 ** await meta.decimals()));
    }
}
