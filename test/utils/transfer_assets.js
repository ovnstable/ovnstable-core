const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts, upgrades} = require("hardhat");
const { smock} = require("@defi-wonderland/smock");

const hre = require("hardhat");
const fs = require("fs");

chai.use(smock.matchers);
let assets = JSON.parse(fs.readFileSync('./assets.json'));

describe("TransferAssets", function () {

    let transfer;
    let portfolio;
    let vault;
    let oldVault;
    let usdc;

    beforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");

        await deployments.fixture(["BuyUsdc", "Vault", "TransferAssets", "Portfolio", "setting-price-getters", "price-getters"]);

        const {deployer} = await getNamedAccounts();
        transfer = await ethers.getContract("TransferAssets");
        portfolio = await ethers.getContract("Portfolio");
        vault = await ethers.getContract("Vault");

        const contractFactory = await ethers.getContractFactory("Vault");

        oldVault = await upgrades.deployProxy(contractFactory, {kind: 'uups'});
        await upgrades.upgradeProxy(oldVault, contractFactory);
        let tx = await transfer.setVaults(oldVault.address, vault.address, portfolio.address);
        await tx.wait();

        await oldVault.setPortfolioManager(transfer.address);
        await vault.setPortfolioManager(transfer.address);

        usdc = await ethers.getContractAt("ERC20", assets.usdc);

        expect(await usdc.balanceOf(oldVault.address)).to.eq(0)
        expect(await usdc.balanceOf(vault.address)).to.eq(0)

        await usdc.transfer(oldVault.address, 1000);
    });


    // TODO Update logic transfer.move();
    /* it("Move balances", async function () {

        expect(await usdc.balanceOf(oldVault.address)).to.eq(1000)
        expect(await usdc.balanceOf(vault.address)).to.eq(0)

        let tx = await transfer.move();
        await tx.wait();

        expect(await usdc.balanceOf(oldVault.address)).to.eq(0)
        expect(await usdc.balanceOf(vault.address)).to.eq(1000)

    }); */


});

