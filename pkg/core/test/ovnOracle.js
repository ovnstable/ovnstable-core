const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
const chai = require("chai");
chai.use(require('chai-bignumber')());
const axios = require("axios");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

const {
    initWallet,
    getContract,
    getERC20,
    getERC20ByAddress, transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const {getOdosSwapData, getOdosAmountOut} = require("@overnight-contracts/common/utils/odos-helper");


describe("OvnOracle", function () {

    let account;
    let ovnOracle;
    let ovn;
    let usdc;

    describe(`Name`, async function () {

        sharedBeforeEach("deploy contracts", async () => {
            await hre.run("compile");
            await resetHardhat(process.env.STAND);

            await deployments.fixture(['OvnOracle']);

            const signers = await ethers.getSigners();
            account = signers[0];

            ovnOracle = (await ethers.getContract("OvnOracle")).connect(account);
            ovn = (await getContract('Ovn')).connect(account);
            usdc = (await getERC20ByAddress(OPTIMISM.usdc)).connect(account);

            await (await ovnOracle.setUpParams({ovn: ovn.address})).wait();
        });

        describe('Ovn/Usdc Oracle', function () {

            sharedBeforeEach("Name", async () => {
                console.log("lol");
            });

            it("Ovn To Usdc", async function () {
                let result = await ovnOracle.ovnToAsset(toE18(1), usdc.address);
                console.log("result", result.toString());
            })

            it("Usdc To Ovn", async function () {
                let result = await ovnOracle.assetToOvn(toE6(1), usdc.address);
                console.log("result", result.toString());
            })
        });

    });

});


