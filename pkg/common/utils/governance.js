const {fromE18, toE18, fromAsset, fromE6, toAsset} = require("./decimals");
const {expect} = require("chai");
const {getContract, initWallet, getPrice, impersonateAccount, getWalletAddress, getCoreAsset, convertWeights, getChainId,
    transferAsset
} = require("./script-utils");
const hre = require('hardhat');
const {execTimelock, showM2M, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {createRandomWallet, getTestAssets, prepareEnvironment} = require("./tests");
const {Roles} = require("./roles");
const fs = require("fs");
const {getEmptyOdosData} = require("./odos-helper");
const ethers= hre.ethers;
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
const { platform } = process;

const appRoot = require('app-root-path').path;

async function createProposal(name, addresses, values, abis){

    let timelock = await getContract('AgentTimelock');

    let ovnAgent = await timelock.ovnAgent();
    let minDelay = await timelock.getMinDelay();


    let batch = {
        version: "1.0",
        chainId: await getChainId(),
        createdAt: new Date().getTime(),
        meta: {
            name: "Transactions Batch",
            description: "",
            txBuilderVersion: "1.16.2",
            createdFromSafeAddress: ovnAgent,
            createdFromOwnerAddress: "",
            checksum: ""
        },
        transactions: [

        ]
    }

    for (let i = 0; i < addresses.length; i++) {
        batch.transactions.push(createTransaction(timelock, minDelay, addresses[i], values[i], abis[i]))
    }

    let batchName;
    let stand = process.env.STAND;

    stand = stand.split("_")[0]

    if (platform === 'win32'){
        batchName = `${appRoot}\\pkg\\proposals\\batches\\${stand}\\${name}.json`;
    }else {
        batchName = `${appRoot}/pkg/proposals/batches/${stand}/${name}.json`;
    }

    let data = JSON.stringify(batch);
    console.log(data)
    await fs.writeFileSync(batchName, data);
}

function createTransaction(timelock, delay, address, value, data){


    let salt = ethers.utils.solidityKeccak256(['uint256'], [(new Date().getTime())]);

    return {
        "to": timelock.address,
        "value": "0",
        "data": null,
        "contractMethod": {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                },
                {
                    "internalType": "bytes32",
                    "name": "predecessor",
                    "type": "bytes32"
                },
                {
                    "internalType": "bytes32",
                    "name": "salt",
                    "type": "bytes32"
                },
                {
                    "internalType": "uint256",
                    "name": "delay",
                    "type": "uint256"
                }
            ],
            "name": "schedule",
            "payable": false
        },
        "contractInputsValues": {
            "target": address,
            "value": `${value}`,
            "data": `${data}`,
            "predecessor": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "salt": salt,
            "delay": `${delay}`
        }
    }

}

async function testUsdPlus(id, stand = process.env.STAND){
    console.log(`Run tests USD+`);

    await prepareEnvironment();

    let exchange = await getContract('Exchange', stand);
    let pm = await getContract('PortfolioManager', stand);
    let m2m = await getContract('Mark2Market', stand);
    let usdPlusToken = await getContract('UsdPlusToken', stand);
    let roleManager = await getContract('RoleManager', stand);
    let asset = await getCoreAsset(stand);


    let walletAddress = await getWalletAddress(); 
    await transferAsset(await exchange.usdc(), walletAddress);

    let tables = [];
 
    tables.push({
        name: 'ID',
        result: id
    });

    tables.push({
        name: 'BlockNumber',
        result: await ethers.provider.getBlockNumber()
    });

    tables.push({
        name: 'Date/Time',
        result: new Date()
    });

    tables.push({
        name: 'Tests',
        result: '------'
    });

    tables.push(await testCase(async ()=>{

        let amountAsset = await asset.balanceOf(walletAddress);
        await (await asset.approve(exchange.address, amountAsset, await getPrice())).wait();
        await (await exchange.buy(asset.address, amountAsset, await getPrice())).wait();

    }, 'exchange.mint'));

    tables.push(await testCase(async ()=>{

        let amountUsdPlus = await usdPlusToken.balanceOf(walletAddress);
        await (await usdPlusToken.approve(exchange.address, amountUsdPlus, await getPrice())).wait();
        await (await exchange.redeem(asset.address, amountUsdPlus, await getPrice())).wait();

    }, 'exchange.redeem'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=>{
            await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address, await getPrice());
            await pm.connect(timelock).balance( await getPrice());
        });

    }, 'pm.balance'));

    tables.push(await testCase(async ()=>{
        await m2m.strategyAssets();
    }, 'm2m.strategyAssets'));

    tables.push(await testCase(async ()=>{
        await m2m.totalNetAssets();
    }, 'm2m.totalNetAssets'));

    tables.push(await testCase(async ()=>{
        await m2m.totalLiquidationAssets();
    }, 'm2m.totalLiquidationAssets'));
 
    tables.push(await testCase(async ()=>{
        await execTimelock(async (timelock)=>{
            await (await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address, await getPrice())).wait();
            await (await roleManager.connect(timelock).grantRole(Roles.UNIT_ROLE, timelock.address, await getPrice())).wait();
            await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, await getPrice())).wait();
            await (await exchange.payout(false, await getEmptyOdosData(), await getPrice()) ).wait();
        });

    }, 'exchange.payout'));

    console.table(tables);
}

async function testCase(test, id) {

    try {
        await test();
        return{
            name: id,
            result: 'SUCCESS'
        }
    } catch (e) {
        console.error(`[Test] Fail test case: ${id}: ${e}`);
        return{
            name: id,
            result: 'FAIL'
        }
    }
}

async function testStrategy(id, strategy, stand = process.env.STAND) {
    let asset = await getCoreAsset();
    let walletAddress = await getWalletAddress(); 
    await transferETH(10, walletAddress, await getPrice());
    let roleManager = await getContract('RoleManager', stand);



    let tables = [];

    tables.push({
        name: 'ID',
        result: id
    });

    tables.push({
        name: 'BlockNumber',
        result: await ethers.provider.getBlockNumber()
    });

    tables.push({
        name: 'Date/Time',
        result: new Date()
    });

    tables.push({
        name: 'Tests',
        result: '------'
    });


    let isNewStrategy = strategy.setStrategyParams !== undefined;

    await execTimelock(async (timelock)=>{

        if (isNewStrategy){
            await strategy.connect(timelock).setStrategyParams(timelock.address, roleManager.address, await getPrice());
        }else {
            await strategy.connect(timelock).setPortfolioManager(timelock.address, await getPrice());
        }

    })


    tables.push(await testCase(async ()=>{
        await strategy.netAssetValue();
    }, 'strategy.netAssetValue'));

    tables.push(await testCase(async ()=>{
        await strategy.netAssetValue();
    }, 'strategy.liquidationValue'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {

            await getTestAssets(walletAddress);
            let amount = toAsset(10_000);
            await asset.transfer(strategy.address, amount, await getPrice());
            await strategy.connect(timelock).stake(asset.address, amount, await getPrice());
        });
    }, 'strategy.stake'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            let amount = toAsset(10_000);
            await strategy.connect(timelock).unstake(asset.address, amount, walletAddress, false, await getPrice());
        });
    }, 'strategy.unstake'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            let amount = toAsset(10_000);
            await strategy.connect(timelock).claimRewards(timelock.address, await getPrice());
        });
    }, 'strategy.claimRewards'));

    tables.push(await testCase(async ()=>{

        await execTimelock(async (timelock)=> {
            await strategy.connect(timelock).unstake(asset.address, 0, walletAddress, true, await getPrice());
        });
    }, 'strategy.unstakeFull'));

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
                ...(await getPrice())
            }

            // console.log(tx)

            console.log(`Transaction: index: [${i}] address: [${address}]`)
            await (await timelock.sendTransaction(tx)).wait();

        }
    })
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
    createProposal: createProposal,
    testProposal: testProposal,
    testUsdPlus: testUsdPlus,
    testStrategy: testStrategy,
    getProposalState: getProposalState,
}
