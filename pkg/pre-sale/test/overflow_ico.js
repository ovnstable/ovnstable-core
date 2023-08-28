const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");


describe("OverflowICO", function () {

    let account;
    let overflowICO;
    let salesToken;
    let secondAccount;

    let startDate;
    let endDate;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        secondAccount = signers[1];

        await deployments.fixture(['SalesToken']);

        salesToken = await ethers.getContract("SalesToken");



        startDate = Math.floor((new Date().getTime()) / 1000);
        console.log('startDate: ' + startDate);
        endDate = startDate + addDays(5);
        console.log('endDate: ' + endDate);

        await ethers.provider.send("evm_setNextBlockTimestamp", [startDate]);

        let params = {
            salesToken: salesToken.address,
            tokensToSell: '500000000000000000000000',
            ethersToRaise: '450000000000000000000',
            refundThreshold: '150000000000000000000',
            startTime: startDate,
            endTime: endDate,
            receiveTime: endDate + 100,
            vestingBegin: '1692961500',
            vestingDuration: '5259486',
            vestingProportion: '300000000000000000',
            minCommit: '1000000000000000',
            maxCommit: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
            emissionToken: salesToken.address,
            totalEmission: '500000000000000000000000',
            burnAddress: '0x000000000000000000000000000000000000dead'
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

    describe("start", () =>{


        beforeEach(async () =>{

            await salesToken.mint(account.address, toE18(1_000_000));
            await salesToken.approve(overflowICO.address, toE18(1_000_000));
            await overflowICO.start();
        });

        it("onlyOwner", async ()=>{
            await expectRevert(overflowICO.connect(secondAccount).start(), "Ownable: caller is not the owner");
        });

        it("started = true", async ()=>{
            expect(await overflowICO.started()).to.eq(true);
        });

        it("Error: Already started.", async ()=>{
            await expectRevert(overflowICO.start(), "Already started.");
        });

        it("transfer correct", async ()=>{
            expect(fromE18(await salesToken.balanceOf(overflowICO.address))).to.eq(1_000_000);
        });

    })

    describe('commit', ()=>{

        beforeEach(async () =>{

            await salesToken.mint(account.address, toE18(1_000_000));
            await salesToken.approve(overflowICO.address, toE18(1_000_000));
            await overflowICO.start();
            await overflowICO.addToWhitelist([account.address]);

        });


        it('Revert: Can only deposit Ether during the sale period', async ()=>{
            await ethers.provider.send("evm_setNextBlockTimestamp", [endDate + 1000]);
            await expectRevert(overflowICO.commit({value: ethers.utils.parseEther(1 + "", "ether")}), 'Can only deposit Ether during the sale period');
        })

        it('Revert: Commitment amount is outside the allowed range -> minCommit', async ()=>{
            await expectRevert(overflowICO.commit({value: ethers.utils.parseEther("0.0001", "ether")}), 'Commitment amount is outside the allowed range');
        })

        it('commitments = amount', async ()=>{
            let value = ethers.utils.parseEther("0.1", "ether");
            await overflowICO.commit({value: value});
            expect(await overflowICO.commitments(account.address)).to.eq(value);
        })

        it('totalEmission = amount', async ()=>{
            let value = ethers.utils.parseEther("0.1", "ether");
            await overflowICO.commit({value: value});
            expect(await overflowICO.totalCommitments()).to.eq(value);
        })

        it('emissionPerEther (?)', async ()=>{
            let value = ethers.utils.parseEther("0.1", "ether");
            await overflowICO.commit({value: value});

            //TODO Need check formula
            expect(await overflowICO.emissionPerEther()).to.eq('some value');
        })

        it('missedEmissions (?)', async ()=>{
            let value = ethers.utils.parseEther("0.1", "ether");
            await overflowICO.commit({value: value});

            //TODO Need check formula
            expect(await overflowICO.missedEmissions(account.address)).to.eq('some value');
        })
    })


    describe("whitelist", () => {

        beforeEach(async () => {
            await salesToken.mint(account.address, toE18(1_000_000));
            await salesToken.approve(overflowICO.address, toE18(1_000_000));
            await overflowICO.start();
        })

        it("commit && not whitelist", async function () {
            await expectRevert(commit(1), '!whitelist');
        });

        it("commit && add whitelist", async function () {
            await overflowICO.addToWhitelist([account.address]);
            await commit(1);
        });

        it("commit && add/remove whitelist", async function () {
            await overflowICO.addToWhitelist([account.address]);
            await overflowICO.removeFromWhitelist([account.address]);
            await expectRevert(commit(1), '!whitelist');
        });
    })


    function addDays(days) {
        return (days * 24 * 60 * 60 * 1000);
    }

    async function commit(ether) {
        await overflowICO.commit({value: ethers.utils.parseEther(ether + "", "ether")});
    }


});




