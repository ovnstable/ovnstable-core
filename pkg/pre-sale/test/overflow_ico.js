const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");


describe("OverflowICO", function () {

    let account;
    let overflowICO;
    let salesToken;
    let emissionToken;
    let secondAccount;

    let startDate;
    let endDate;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        secondAccount = signers[1];

        await deployments.fixture(['SalesToken', 'EmissionToken']);

        salesToken = await ethers.getContract("SalesToken");
        emissionToken = await ethers.getContract("EmissionToken");

        await salesToken.setExchanger(account.address);

        startDate = Math.floor((new Date().getTime()) / 1000);
        console.log('startDate: ' + startDate);
        endDate = startDate + addDays(5);
        console.log('endDate: ' + endDate);

        await ethers.provider.send("evm_setNextBlockTimestamp", [startDate]);

        let params = {
            salesToken: salesToken.address,
            ethersToRaise: '300000000000',
            refundThreshold: '225000000000',
            startTime: startDate,
            endTime: endDate,
            receiveTime: endDate + 100,
            vestingBegin: '1692961500',
            vestingDuration: '5259486',
            vestingProportion: '300000000000000000',
            minCommit: '1000000',
            maxCommit: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
            emissionToken: emissionToken.address,
            totalEmission: '10000000000',
        }

        overflowICO = await deployments.deploy("OverflowICO", {
            from: account.address,
            args: [
                params
            ],
            log: true,
            skipIfAlreadyDeployed: false
        });

        console.log("OverflowICO created at " + overflowICO.address);

        overflowICO = await ethers.getContract("OverflowICO");
    });

    // describe("start", () =>{


    //     beforeEach(async () =>{
    //         await emissionToken.mint(account.address, toE18(10_000));
    //         await emissionToken.approve(overflowICO.address, toE18(10_000));
    //         await overflowICO.start();
    //     });

    //     it("onlyOwner", async ()=>{
    //         await expectRevert(overflowICO.connect(secondAccount).start(), "Ownable: caller is not the owner");
    //     });

    //     it("started = true", async ()=>{
    //         expect(await overflowICO.started()).to.eq(true);
    //     });

    //     it("Error: Already started.", async ()=>{
    //         await expectRevert(overflowICO.start(), "Already started.");
    //     });

    //     it("transfer correct", async ()=>{
    //         expect(fromE6(await emissionToken.balanceOf(overflowICO.address))).to.eq(10_000);
    //     });

    // })

    // describe('finish', ()=>{

    //     beforeEach(async () =>{

    //         await salesToken.mint(account.address, toE18(1_000_000));
    //         await salesToken.approve(overflowICO.address, toE18(1_000_000));
    //         await emissionToken.mint(account.address, toE18(10_000));
    //         await emissionToken.approve(overflowICO.address, toE18(10_000));
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([account.address]);

    //     });


    //     it('Revert: Can only finish after the sale has ended', async ()=>{
    //         await expectRevert(overflowICO.finish(), "Can only finish after the sale has ended");
    //     })

    //     it("onlyOwner", async ()=>{
    //         await expectRevert(overflowICO.connect(secondAccount).finish(), "Ownable: caller is not the owner");
    //     });

    //     it('Revert: Already finished', async ()=>{
    //         await ethers.provider.send("evm_setNextBlockTimestamp", [endDate+1000]);
    //         await overflowICO.finish();
    //         await expectRevert(overflowICO.finish(), "Already finished");
    //     });

    //     it('USD+ send to owner', async ()=>{
    //         let balanceBefore = await salesToken.balanceOf(account.address);
    //         console.log("balanceBefore", balanceBefore.toString());
    //         await overflowICO.commit(1000000);
    //         await ethers.provider.send("evm_setNextBlockTimestamp", [endDate+1000]);

    //         await overflowICO.finish();
    //         let balanceAfter = await salesToken.balanceOf(account.address);
    //         console.log("balanceAfter", balanceAfter.toString());

    //         expect(balanceBefore).eq(balanceAfter);

    //     });
    // })

    // describe('commit', ()=>{

    //     beforeEach(async () =>{

    //         await salesToken.mint(account.address, toE18(1_000_000));
    //         await salesToken.approve(overflowICO.address, toE18(1_000_000));
    //         await emissionToken.mint(account.address, toE18(10_000));
    //         await emissionToken.approve(overflowICO.address, toE18(10_000));
    //         await overflowICO.start();
    //         await overflowICO.addToWhitelist([account.address]);

    //     });


    //     it('Revert: Can only deposit Ether during the sale period', async ()=>{
    //         await ethers.provider.send("evm_setNextBlockTimestamp", [endDate + 1000]);
    //         await expectRevert(overflowICO.commit(1000000), 'Can only deposit Ether during the sale period');
    //     })

    //     it('Revert: Commitment amount is outside the allowed range -> minCommit', async ()=>{
    //         await expectRevert(overflowICO.commit(1000000), 'Commitment amount is outside the allowed range');
    //     })

    //     it('commitments = amount', async ()=>{
    //         let value = ethers.utils.parseEther("0.1", "ether");
    //         await overflowICO.commit({value: value});
    //         expect(await overflowICO.commitments(account.address)).to.eq(value);
    //     })

    //     it('totalEmission = amount', async ()=>{
    //         let value = ethers.utils.parseEther("0.1", "ether");
    //         await overflowICO.commit({value: value});
    //         expect(await overflowICO.totalCommitments()).to.eq(value);
    //     })

    //     it('emissionPerEther (?)', async ()=>{
    //         let value = ethers.utils.parseEther("0.1", "ether");
    //         await overflowICO.commit({value: value});

    //         //TODO Need check formula
    //         expect(await overflowICO.emissionPerEther()).to.eq('some value');
    //     })

    //     it('missedEmissions (?)', async ()=>{
    //         let value = ethers.utils.parseEther("0.1", "ether");
    //         await overflowICO.commit({value: value});

    //         //TODO Need check formula
    //         expect(await overflowICO.missedEmissions(account.address)).to.eq('some value');
    //     })
    // })


    // describe("whitelist", () => {

    //     beforeEach(async () => {
    //         await salesToken.mint(account.address, toE6(1_000_000));
    //         await salesToken.approve(overflowICO.address, toE6(1_000_000));
    //         await emissionToken.mint(account.address, toE6(10_000));
    //         await emissionToken.approve(overflowICO.address, toE6(10_000));
    //         await overflowICO.start();
    //     })

    //     it("commit && not whitelist", async function () {
    //         await expectRevert(overflowICO.commit(1000000), '!whitelist');
    //     });

    //     it("commit && add whitelist", async function () {
    //         await overflowICO.addToWhitelist([account.address]);
    //         await overflowICO.commit(1000000);
    //     });

    //     it("commit && add/remove whitelist", async function () {
    //         await overflowICO.addToWhitelist([account.address]);
    //         await overflowICO.removeFromWhitelist([account.address]);
    //         await expectRevert(overflowICO.commit(1000000), '!whitelist');
    //     });
    // })

    describe('claim', ()=>{

        beforeEach(async () =>{

            await salesToken.mint(account.address, toE6(225000));
            await salesToken.approve(overflowICO.address, toE6(225000));
            await emissionToken.mint(account.address, toE6(10_000));
            await emissionToken.approve(overflowICO.address, toE6(10_000));
            await overflowICO.start();
            await overflowICO.addToWhitelist([account.address]);
            await overflowICO.commit("225000000000");
            await spendTimeWithPayoyt(endDate + 1000);
            await overflowICO.finish();
        });


        it('[1] claim', async ()=>{
            await overflowICO.claim();
            await overflowICO.claim2();
            await overflowICO.claim3();
        })





    })

    function addDays(days) {
        return (days * 24 * 60 * 60 * 1000);
    }

    async function spendTimeWithPayoyt(value) {
        await ethers.provider.send("evm_setNextBlockTimestamp", [value]);
        await salesToken.setLiquidityIndex("1010000000000000000000000000");
    }

});




