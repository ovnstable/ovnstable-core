const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");


describe("OverflowICO", function () {

    let account;
    let overflowICO;
    let salesToken;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];

        await deployments.fixture(['SalesToken']);

        salesToken = await ethers.getContract("SalesToken");

        let params = {
            vestingBegin: '1692961500',
            vestingDuration: '5259486',
            vestingProportion: '300000000000000000',
        }
        overflowICO = await deployments.deploy("OverflowICO", {
            from: account.address,
            args: [
                salesToken.address, // salesToken
                '500000000000000000000000', // tokensToSale
                '450000000000000000000', // ethersToRaise
                '150000000000000000000', // refundThreshold
                '1692788400', // startTime
                '1692961200', // endTime
                '1692961500', // receiveTime
                params,
                '1000000000000000', // minCommit
                '115792089237316195423570985008687907853269984665640564039457584007913129639935', // maxCommit
                salesToken.address, // emission token
                '500000000000000000000000', // totalEmission
                '0x000000000000000000000000000000000000dead' // burnAddress
            ],
            log: true,
            skipIfAlreadyDeployed: false
        });

        console.log("OverflowICO created at " + overflowICO.address);

        overflowICO = await ethers.getContract("OverflowICO");
    });



    it("start", async function () {
        await salesToken.mint(account.address, toE18(1_000_000));
        await salesToken.approve(overflowICO.address, toE18(1_000_000));
        console.log('Balance user: ' + fromE18(await salesToken.balanceOf(account.address)));
        console.log('Balance ico:  ' + fromE18(await salesToken.balanceOf(overflowICO.address)));
        console.log('allowance:  ' + fromE18(await salesToken.allowance(account.address, overflowICO.address)));

        await overflowICO.start();

    });


});




