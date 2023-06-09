const {fromE18, toE18, fromAsset, fromE6, toAsset} = require("./decimals");
const {expect} = require("chai");
const {getContract, initWallet, getPrice, impersonateAccount, getWalletAddress, getCoreAsset, convertWeights} = require("./script-utils");
const hre = require('hardhat');
const {execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createRandomWallet, getTestAssets} = require("./tests");
const {Roles} = require("./roles");

const ethers= hre.ethers;
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];


async function createProposal(addresses, values, abis){

    let governor = await getContract('OvnGovernor');

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id(new Date().toString()),
        await getPrice()
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)

    return proposalId;
}

async function testUsdPlus(){


    let tables = [];

    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();
    let usdPlusToken = await getContract('UsdPlusToken');
    let m2m = await getContract('Mark2Market');

    let walletAddress = await getWalletAddress();
    let amountAsset = await asset.balanceOf(walletAddress);
    let amountUsdPlus = await usdPlusToken.balanceOf(walletAddress);

    let fromUsdPlus = fromE6;

    tables.push({
        name: 'before: mint',
        asset: fromAsset(amountAsset),
        usdPlus: fromUsdPlus(amountUsdPlus)
    })

    await (await asset.approve(exchange.address, amountAsset)).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, amountAsset)).wait();
    console.log('Exchange.buy done');

    amountAsset = await asset.balanceOf(walletAddress);
    amountUsdPlus = await usdPlusToken.balanceOf(walletAddress);

    tables.push({
        name: 'after: mint',
        asset: fromAsset(amountAsset),
        usdPlus: fromUsdPlus(amountUsdPlus)
    })

    tables.push({
        name: 'before: redeem',
        asset: fromAsset(amountAsset),
        usdPlus: fromUsdPlus(amountUsdPlus)
    })

    await (await usdPlusToken.approve(exchange.address, amountUsdPlus)).wait();
    console.log('UsdPlus approve done');
    await (await exchange.redeem(asset.address, amountUsdPlus)).wait();
    console.log('Exchange.redeem done');

    amountAsset = await asset.balanceOf(walletAddress);
    amountUsdPlus = await usdPlusToken.balanceOf(walletAddress);

    tables.push({
        name: 'after: redeem',
        asset: fromAsset(amountAsset),
        usdPlus: fromUsdPlus(amountUsdPlus)
    })

    console.table(tables);


    console.log('Execute pm.balance()');
    await execTimelock(async (timelock)=>{
        let pm = await getContract('PortfolioManager');
        await pm.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await pm.connect(timelock).balance();
    });


    console.log('strategyAssets: ' + await m2m.strategyAssets());
    console.log('totalNetAssets: ' + fromAsset(await m2m.totalNetAssets()));
    console.log('totalLiquidationAssets: ' + fromAsset(await m2m.totalLiquidationAssets()));

    console.log('Execute exchange.payout()');
    await execTimelock(async (timelock)=>{
        await exchange.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await exchange.connect(timelock).grantRole(Roles.UNIT_ROLE, timelock.address);
        await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60);
        await exchange.connect(timelock).payout();
    });

}

async function testStrategy(strategy){

    let testWallet = await createRandomWallet();
    let asset = await getCoreAsset();
    let mainWallet = await initWallet();

    let nav = await strategy.netAssetValue();

    await execTimelock(async (timelock)=>{

        console.log('Test strategy: ' + strategy.address);

        let operations = [];

        await strategy.connect(timelock).setPortfolioManager(timelock.address);

        let balanceBefore = 0;
        let navBefore = 0;
        let navAfter = 0;
        let balanceAfter = 0;


        await getTestAssets(mainWallet.address);

        let amount = toAsset(50_000);
        await asset.connect(mainWallet).transfer(testWallet.address, amount);

        try {
            navBefore = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceBefore = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));
            await asset.connect(testWallet).transfer(strategy.address, amount);
            await strategy.connect(timelock).stake(asset.address, amount);
            navAfter = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceAfter = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));

            operations.push({
                name: 'Stake',
                nav_delta: navAfter - navBefore,
                balance_delta: balanceAfter - balanceBefore
            });
        } catch (e) {
            console.error('Stake fail: ' + e);

            operations.push({
                name: 'Stake',
                nav_delta: 'error',
                balance_delta: 'error'
            });
        }

        try {
            balanceBefore = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));
            navBefore = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            await strategy.connect(timelock).claimRewards(testWallet.address);
            navAfter = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceAfter = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));

            operations.push({
                name: 'ClaimRewards',
                nav_delta: navAfter - navBefore,
                balance_delta: balanceAfter - balanceBefore
            });
        } catch (e) {
            console.error('ClaimRewards fail: ' + e);

            operations.push({
                name: 'ClaimRewards',
                nav_delta: 'error',
                balance_delta: 'error'
            });
        }


        try {
            navBefore = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceBefore = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));
            await strategy.connect(timelock).unstake(asset.address, amount, testWallet.address, false);
            navAfter = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceAfter = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));

            operations.push({
                name: 'UnStake',
                nav_delta: navAfter - navBefore,
                balance_delta: balanceAfter - balanceBefore
            });
        } catch (e) {
            console.error('Unstake fail: ' + e);

            operations.push({
                name: 'UnStake',
                nav_delta: 'error',
                balance_delta: 'error'
            });
        }

        try {
            navBefore = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceBefore = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));
            await strategy.connect(timelock).unstake(asset.address, 0, testWallet.address, true);
            navAfter = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceAfter = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));

            operations.push({
                name: 'UnStakeFull',
                nav_delta: navAfter - navBefore,
                balance_delta: balanceAfter - balanceBefore
            });
        } catch (e) {
            console.error('UnstakeFull fail: ' + e);

            operations.push({
                name: 'UnStakeFull',
                nav_delta: 'error',
                balance_delta: 'error'
            });
        }

        try {
            navBefore = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceBefore = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));
            await asset.connect(testWallet).transfer(strategy.address, nav);
            await strategy.connect(timelock).stake(asset.address, nav);
            navAfter = Number.parseInt(fromAsset(await strategy.netAssetValue()));
            balanceAfter = Number.parseInt(fromAsset(await asset.balanceOf(testWallet.address)));

            operations.push({
                name: 'Stake Nav base',
                nav_delta: navAfter - navBefore,
                balance_delta: balanceAfter - balanceBefore
            });
        } catch (e) {
            console.error('Stake Nav base fail: ' + e);

            operations.push({
                name: 'Stake Nav base',
                nav_delta: 'error',
                balance_delta: 'error'
            });
        }

        console.table(operations);
        console.log('Test strategy done: ' + strategy.address);
    });

}

async function testInsurance(){


    let tables = [];

    let insurance = await getContract('InsuranceExchange');
    let asset = await getCoreAsset();
    let insuranceToken = await getContract('InsuranceToken');

    let amountAsset = await asset.balanceOf(await getWalletAddress());
    let amountInsurance = await insuranceToken.balanceOf(await getWalletAddress());

    tables.push({
        name: 'before: mint',
        asset: fromAsset(amountAsset),
        ins: fromAsset(amountInsurance)
    })

    await (await asset.approve(insurance.address, amountAsset)).wait();
    console.log('Asset approve done');

    let mint = { amount: amountAsset};
    await (await insurance.mint(mint)).wait();
    console.log('Insurance.mint done');

    amountAsset = await asset.balanceOf(await getWalletAddress());
    amountInsurance = await insuranceToken.balanceOf(await getWalletAddress());

    tables.push({
        name: 'after: mint',
        asset: fromAsset(amountAsset),
        ins: fromAsset(amountInsurance)
    })

    console.table(tables);
}


async function testProposal(addresses, values, abis){

    console.log('Count transactions: ' + addresses.length);

    await execTimelock(async (timelock)=>{

        for (let i = 0; i < addresses.length; i++) {

            let address = addresses[i];
            let abi = abis[i];

            let tx = {
                from: timelock.address,
                to: address,
                value: 0,
                data: abi,
                gasLimit: 15000000
            }

            console.log(`Transaction: index: [${i}] address: [${address}]`)
            await timelock.sendTransaction(tx)

        }
    })
}

async function execProposal(id) {

    let wallet = await initWallet(ethers)
    let governator = await getContract('OvnGovernor' );
    let ovn = await getContract('OvnToken');

    let ovnOwner = await impersonateAccount('0xe497285e466227f4e8648209e34b465daa1f90a0');
    await ovn.connect(ovnOwner).transfer(wallet.address, await ovn.balanceOf(ovnOwner.address));
    await ovn.connect(wallet).delegate(wallet.address);

    let quorum = fromE18((await governator.quorum(await ethers.provider.getBlockNumber() - 1)).toString());
    console.log('Quorum: ' + quorum);
    console.log('OVN balance user: ' + fromE18((await ovn.balanceOf(wallet.address)).toString()));

    const proposalId = id;

    let votes = ethers.utils.parseUnits("100000100", 9);

    let state = proposalStates[await governator.state(proposalId)];
    if (state === "Executed") {
        return;
    }
    if (state === "Queued"){
        const sevenDays = 6 * 60 * 1000; // 6 hours
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
        await governator.connect(wallet).executeExec(proposalId);
        return;
    }

    console.log('State status: ' + state)
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting

    console.log('Votes: ' + votes);

    let item = await governator.connect(wallet).proposals(proposalId);
    console.log('Votes for: ' + item.forVotes / 10 ** 18);

    await governator.connect(wallet).castVote(proposalId, 1);

    item = await governator.connect(wallet).proposals(proposalId);
    console.log('Votes for: ' + item.forVotes / 10 ** 18);

    let total = fromE18((await ovn.getVotes(wallet.address)).toString());
    console.log('Delegated ' + total);

    console.log('State: ' + proposalStates[await governator.state(proposalId)]);

    let waitBlock = 150;
    for (let i = 0; i < waitBlock; i++) {
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    }

    state = proposalStates[await governator.state(proposalId)];
    expect('Succeeded').to.eq(state);
    await governator.connect(wallet).queueExec(proposalId);

    const hours = 6 * 60 * 1000; // 6 hours
    await ethers.provider.send("evm_increaseTime", [hours])
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    await governator.connect(wallet).executeExec(proposalId);


    state = proposalStates[await governator.state(proposalId)];
    console.log('State status: ' + state)
    expect(state).to.eq('Executed');
}

async function getProposalState(proposalId){
    let governor = await getContract('OvnGovernor');
    let state = proposalStates[await governor.state(proposalId)];
    console.log('Proposal state: ' + state);

    let data = await governor.proposals(proposalId);

    console.log('StartBlock:     ' + data.startBlock);
    console.log('EndBlock:       ' + data.endBlock);
    console.log('CurrentBlock:   ' + await ethers.provider.getBlockNumber());
    console.log('ForVotes:       ' + fromE18(data.forVotes));

    return state;
}

module.exports = {
    execProposal: execProposal,
    createProposal: createProposal,
    testProposal: testProposal,
    testUsdPlus: testUsdPlus,
    testInsurance: testInsurance,
    testStrategy: testStrategy,
    getProposalState: getProposalState,
}
