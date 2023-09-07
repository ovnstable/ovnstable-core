const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");


describe("Whitelist", function () {

    let account;
    let whitelist;
    let serviceNft;
    let partnerNft;
    let firstAccount;

    sharedBeforeEach('deploy and setup', async () => {

        await hre.run("compile");
        const signers = await ethers.getSigners();
        account = signers[0];
        firstAccount = signers[1];
        console.log("account address:", account.address);
        console.log("firstAccount address:", firstAccount.address);

        await deployments.fixture(['Whitelist', 'WhitelistNFT']);

        whitelist = await ethers.getContract("Whitelist");
        partnerNft = await ethers.getContract("WhitelistNFT");

        await whitelist.setParams({
            serviceNft: '0x512cC325BAE1Dd4590F6D67733aAf8e6a0526eaB', // NFT Galxe
            partnerNft: partnerNft.address,
            guarded: account.address,
        });

        console.log('SetParams done()')
    });


    describe("isWhitelist", () => {

        it("account is !whitelist", async () => {
            expect(await whitelist.isWhitelist(account.address)).to.eq(false);
        });

        it("account is whitelist [partnerNft]", async () => {
            await partnerNft.safeMint(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(true);
        });

    })

    describe("verify", () => {

        it("reset whitelist", async () => {
            await partnerNft.safeMint(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(true);
            await whitelist.verify(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(false);
        });

        it("partner.tokenId is used", async () => {
            await partnerNft.safeMint(account.address);

            let number = await partnerNft.tokenByIndex(0);
            expect(await whitelist.usedPartnerNftIds(number)).to.eq(false);
            await whitelist.verify(account.address);
            expect(await whitelist.usedPartnerNftIds(number)).to.eq(true);
        });

        it("multy whitelist", async () => {
            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(true);
            await whitelist.verify(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(true);
            await whitelist.verify(account.address);
            expect(await whitelist.isWhitelist(account.address)).to.eq(false);
        });

        it("!whitelist", async () => {
            await expectRevert(whitelist.verify(account.address),'!whitelist');
        });

        it("only guarded", async () => {
            await expectRevert(whitelist.connect(firstAccount).verify(account.address),'only guarded');
        });
    })




});
