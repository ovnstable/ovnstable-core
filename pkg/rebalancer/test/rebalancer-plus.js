const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const {greatLess, resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {waffle} = require("hardhat");
const {getAbi, getERC20, transferUSDC} = require("@overnight-contracts/common/utils/script-utils");
const {deployMockContract, provider} = waffle;

const SENIOR = 0;
const JUNIOR = 1;

describe("Exchange", function () {

    let account;

    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        await deployments.fixture(['RebalancerPlus']);

        const {deployer} = await getNamedAccounts();
        account = deployer;
    });

    it("Test", async function () {


    });
});
