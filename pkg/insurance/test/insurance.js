const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");
const hre = require("hardhat");
const BigNumber = require('bignumber.js');
const {greatLess, resetHardhat} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {evmCheckpoint, evmRestore, sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const chai = require("chai");
chai.use(require('chai-bignumber')());
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {waffle} = require("hardhat");
const {getAbi, getERC20, transferUSDC} = require("@overnight-contracts/common/utils/script-utils");
const {deployMockContract, provider} = waffle;


describe("Exchange", function () {

    let account;
    let insurance;
    let senior;
    let junior;
    let asset;

    let toAsset = function () {
    };
    let fromAsset = function () {
    };


    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");
        await resetHardhat(process.env.STAND);

        await deployments.fixture(['MockInsurance']);

        const {deployer} = await getNamedAccounts();
        account = deployer;

        insurance = await ethers.getContract("MockInsurance");
        senior = await ethers.getContract('MockSeniorTranche');
        junior = await ethers.getContract('MockJuniorTranche');

        await insurance.grantRole(await insurance.PORTFOLIO_AGENT_ROLE(), account);
        await insurance.setWeights(10, 30);

        asset = await getERC20('usdc');

        let params = {
            senior: senior.address,
            junior: junior.address,
            asset: DEFAULT.usdc,
        }

        await insurance.setParams(params);

        toAsset = toE6;
        fromAsset = fromE6;

        await transferUSDC(1, account);
    });


    describe('Mint: Senior', function (){

        sharedBeforeEach("Mint: Senior", async () => {
            const sum = toAsset(100);

            await asset.approve(insurance.address, sum);
            await insurance.mintSenior(sum);
        });

        it("Within abroad", async function () {
        });


    });


});


