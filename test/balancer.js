let { MerkleTree, Claim } = require('./merkleTree.js');

const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {FakeContract, smock} = require("@defi-wonderland/smock");

let decimals = require('../utils/decimals');

const fs = require("fs");
const {fromBpsp, toBpsp, toUSDC, fromUSDC, fromWmatic} = require("../utils/decimals");
const hre = require("hardhat");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

chai.use(smock.matchers);

function encodeElement(address, balance) {
    return ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
}

describe("Balancer", function () {

    let vault;
    let rm;
    let usdc;
    let account;
    let connectorBalancer;
//    let merkleOrchard;
    let bpspTUsd;
    let tUsd;
    let bal;
    let wMatic;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['Setting','setting','base', 'Connectors', 'Mark2Market', 'PortfolioManager', 'Exchange', 'UsdPlusToken', 'SettingExchange', 'SettingUsdPlusToken', 'BuyUsdc']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
        vault = await ethers.getContract("Vault");
        rm = await ethers.getContract("RewardManager");
        connectorBalancer = await ethers.getContract("ConnectorBalancer");
//        merkleOrchard = await connectorBalancer.getMerkleOrchard();
        usdc = await ethers.getContractAt("ERC20", assets.usdc);
        bpspTUsd = await ethers.getContractAt("ERC20", assets.bpspTUsd);
        tUsd = await ethers.getContractAt("ERC20", assets.tUsd);
        bal = await ethers.getContractAt("ERC20", assets.bal);
        wMatic = await ethers.getContractAt("ERC20", assets.wMatic);

        vault.setPortfolioManager(account);
    });

    //TODO balancer
    it("Staking USDC", async function () {

        //транзакция 1
        const sum = toUSDC(100000);
        await usdc.transfer(connectorBalancer.address, sum);
        let balance = fromUSDC(await usdc.balanceOf(connectorBalancer.address));
        console.log('Balance usdc: ' + balance);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balance = await bpspTUsd.balanceOf(connectorBalancer.address);
        console.log('Balance bpspTUsd: ' + balance);

        //транзакция 2
        await usdc.transfer(connectorBalancer.address, sum);
        balance = fromUSDC(await usdc.balanceOf(connectorBalancer.address));
        console.log('Balance usdc: ' + balance);

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balance = await bpspTUsd.balanceOf(connectorBalancer.address);
        console.log('Balance bpspTUsd: ' + balance);

//        await ethers.provider.send("evm_mine", [1649121419]);

        //CLAIMING
//        let distributionId1 = await merkleOrchard.getNextDistributionId(bal, connectorBalancer.address);
//        let distributionId2 = await merkleOrchard.getNextDistributionId(tUsd, connectorBalancer.address);
//        let distributionId3 = await merkleOrchard.getNextDistributionId(wMatic, connectorBalancer.address);
//
//        let claimedBalance1 = await merkleOrchard.getRemainingBalance(bal, connectorBalancer.address);
//        let claimedBalance2 = await merkleOrchard.getRemainingBalance(tUsd, connectorBalancer.address);
//        let claimedBalance3 = await merkleOrchard.getRemainingBalance(wMatic, connectorBalancer.address);
//
        const elements1 = [encodeElement(connectorBalancer.address, 0)];
        const merkleTree1 = new MerkleTree(elements1);
        const elements2 = [encodeElement(connectorBalancer.address, 0)];
        const merkleTree2 = new MerkleTree(elements2);
        const elements3 = [encodeElement(connectorBalancer.address, 0)];
        const merkleTree3 = new MerkleTree(elements3);

        const proof1 = merkleTree1.getHexProof(elements1[0]);
        const proof2 = merkleTree2.getHexProof(elements2[0]);
        const proof3 = merkleTree3.getHexProof(elements3[0]);
//
//        const claims = [
//            {
//                distributionId: distributionId1,
//                balance: claimedBalance1,
//                distributor: connectorBalancer.address,
//                tokenIndex: 0,
//                merkleProof: proof1,
//            },
//            {
//                distributionId: distributionId2,
//                balance: claimedBalance2,
//                distributor: connectorBalancer.address,
//                tokenIndex: 1,
//                merkleProof: proof2,
//            },
//            {
//                distributionId: distributionId3,
//                balance: claimedBalance3,
//                distributor: connectorBalancer.address,
//                tokenIndex: 2,
//                merkleProof: proof3,
//            },
//        ];
//        let tokens = [bal, tUsd, wMatic];
        console.log('proof1 %s', proof1);
        console.log('proof2 %s', proof2);
        console.log('proof3 %s', proof3);
        connectorBalancer.claim(proof1, proof2, proof3);

        await connectorBalancer.unstake(usdc.address, balance, vault.address);

//        expect(balance).to.greaterThanOrEqual(98);

    });

    /*it("Unstaking USDC", async function () {

        const sum = toUSDC(100);
        await usdc.transfer(connectorBalancer.address, sum);
        let balance = await usdc.balanceOf(connectorBalancer.address);
        console.log('Balance usdc: ' + fromUSDC(balance));

        await connectorBalancer.stake(usdc.address, sum, vault.address);
        balance = fromBal(await bpspTUsd.balanceOf(vault.address));
        console.log('Balance bpspTUsd: ' + balance);

        const sevenDays = 7 * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine');

        expect(fromUSDC(await usdc.balanceOf(vault.address))).to.equal(0);
        expect(fromUSDC(await bpspTUsd.balanceOf(vault.address))).not.equal(0);

        await vault.transfer(bpspTUsd.address, connectorBalancer.address, await bpspTUsd.balanceOf(vault.address))

        expect(fromUSDC(await bpspTUsd.balanceOf(vault.address))).to.equal(0);

        await connectorBalancer.unstake(usdc.address, (await bpspTUsd.balanceOf(connectorBalancer.address)), vault.address);
        balance = fromUSDC(await usdc.balanceOf(vault.address));
        console.log('Balance usdc: ' + balance);

        expect(balance).to.greaterThanOrEqual(100);


    });*/

});
