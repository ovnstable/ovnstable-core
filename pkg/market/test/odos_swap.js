const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
let { OPTIMISM } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");


describe("OdosSwap", function () {

    let account;
    let userAccount;
    let usdPlus;
    let usdc;
    let odosSwap;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(['test', 'test_setting']);

        const signers = await ethers.getSigners();
        account = signers[0];
        userAccount = signers[1];
        odosSwap = await ethers.getContract("OdosSwap");
        usdPlus = await ethers.getContract("MockUsdPlusToken");
        usdc = await ethers.getContractAt("IERC20", OPTIMISM.usdc);
    });


    it("swap usdc to usd+", async function () {
        // transfer usdc
        await usdc.transfer(userAccount.address, 10000);
        expect(await usdc.balanceOf(userAccount.address)).to.equals(10000);

        await odosSwap.connect(userAccount).swap()// ??
        // не совсем понял как нормально потестить, и связать blockNumber даннные с последними используемыеми (Кроме как делать реквест и потом этот блок подставлять)

    });
});




