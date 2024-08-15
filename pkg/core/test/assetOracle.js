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


describe("AssetOracle", function () {

    let account;
    let assetOracle;
    let asset;
    let usdc;

    describe(`Name`, async function () {

        sharedBeforeEach("deploy contracts", async () => {
            await hre.run("compile");
            await resetHardhat(process.env.STAND);

            await deployments.fixture(['AssetOracleVelodrome']);

            const signers = await ethers.getSigners();
            account = signers[0];

            assetOracle = (await ethers.getContract("AssetOracleVelodrome")).connect(account);
            asset = (await getContract('Ovn')).connect(account);
            usdc = (await getERC20ByAddress(OPTIMISM.usdc)).connect(account);
        });

        describe('Ovn/Usdc Oracle', function () {

            sharedBeforeEach("Name", async () => {
                console.log("sharedBeforeEach");
            });

            it("Ovn To Usdc", async function () {
                let result = await assetOracle.convert(asset.address, usdc.address, toE18(1));
                console.log("result", result.toString());
            })

            it("Usdc To Ovn", async function () {
                let result = await assetOracle.convert(usdc.address, asset.address, toE6(1));
                console.log("result", result.toString());
            })
        });

    });

});


