const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {expect} = require("chai");
const hre = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

describe("RoleManager", function () {


    let account;
    let roleManager;
    let testAccount;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        const { deployer } = await getNamedAccounts();

        account = deployer;
        testAccount = await createRandomWallet();


        await deployments.fixture(['RoleManager']);
        roleManager = await ethers.getContract('RoleManager');
    });

    describe("PortfolioManager: role", function () {

        sharedBeforeEach("PortfolioManager: role", async () => {
            await roleManager.grantRole(Roles.PORTFOLIO_AGENT_ROLE, account);

        });

        it("grantRole: UNIT_ROLE [success]", async function () {
            await roleManager.grantRole(Roles.UNIT_ROLE, testAccount.address);
            expect(await roleManager.hasRole(Roles.UNIT_ROLE, testAccount.address)).to.be.true;
        });

        it("grantRole: UNIT_ROLE [revert]", async function () {
            let error = false;
            try {
                await roleManager.connect(testAccount).grantRole(Roles.UNIT_ROLE, testAccount.address)
            } catch (e) {
                error = true;
            }
            expect(error).to.be.true;
        });


        it("grantRole: FREE_RIDER_ROLE [success]", async function () {
            await roleManager.grantRole(Roles.FREE_RIDER_ROLE, testAccount.address);
            expect(await roleManager.hasRole(Roles.FREE_RIDER_ROLE, testAccount.address)).to.be.true;
        });

        it("grantRole: FREE_RIDER_ROLE [revert]", async function () {
            let error = false;
            try {
                await roleManager.connect(testAccount).grantRole(Roles.FREE_RIDER_ROLE, testAccount.address)
            } catch (e) {
                error = true;
            }
            expect(error).to.be.true;
        });

        it("grantRole: PORTFOLIO_AGENT_ROLE [revert]", async function () {
            let error = false;
            try {
                await roleManager.grantRole(Roles.PORTFOLIO_AGENT_ROLE, testAccount.address);
                await roleManager.connect(testAccount).grantRole(Roles.PORTFOLIO_AGENT_ROLE, testAccount.address)
            } catch (e) {
                error = true;
            }
            expect(error).to.be.true;
        });

        it("grantRole: DEFAULT_ADMIN_ROLE [revert]", async function () {
            let error = false;
            try {
                await roleManager.grantRole(Roles.PORTFOLIO_AGENT_ROLE, collector.address);
                await roleManager.connect(collector).grantRole(Roles.DEFAULT_ADMIN_ROLE, testAccount.address)
            } catch (e) {
                error = true;
            }
            expect(error).to.be.true;
        });

    });
});
