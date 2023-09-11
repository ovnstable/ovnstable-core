const {expect} = require("chai");
const {deployments, ethers, getNamedAccounts} = require("hardhat");
const BN = require("bn.js");
const hre = require("hardhat");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");


const TypeNFT = {
    SERVICE : 0,
    PARTNER: 1,
}

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

    describe("safeMint && safeMints", () => {

        it("mint one NFT", async () => {
            await partnerNft.safeMint(account.address);
            expect(1).to.eq(await partnerNft.totalSupply());
        });

        it("mint 10 NFT", async () => {
            await partnerNft.safeMints(account.address, 10);
            expect(10).to.eq(await partnerNft.totalSupply());
        });

    })

    describe("isWhitelist", () => {

        it("[partner NFT][1 NFT] should account is whitelist", async () => {

            await partnerNft.safeMint(account.address);
            let items = await whitelist.isWhitelist(account.address, [], [0]);
            expect(items[1][0]).to.eq(true);
        });

        it("[partner NFT][2 NFT] should account is whitelist", async () => {

            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);
            let items = await whitelist.isWhitelist(account.address, [], [0,1 ]);
            expect(items[1][0]).to.eq(true);
            expect(items[1][1]).to.eq(true);
        });

        it("[partner NFT][3 NFT] should account is whitelist", async () => {

            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);

            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);
            let items = await whitelist.isWhitelist(account.address, [], [0,1,2]);
            expect(items[1][0]).to.eq(false);
            expect(items[1][1]).to.eq(true);
            expect(items[1][2]).to.eq(true);
        });

        it("[partner NFT][3 NFT] should account is not whitelist", async () => {

            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);

            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);
            await whitelist.verify(account.address, 1, TypeNFT.PARTNER);
            await whitelist.verify(account.address, 2, TypeNFT.PARTNER);
            let items = await whitelist.isWhitelist(account.address, [], [0,1,2]);
            expect(items[1][0]).to.eq(false);
            expect(items[1][1]).to.eq(false);
            expect(items[1][2]).to.eq(false);
        });

        it("[partner NFT][3 NFT] not exist NFT", async () => {

            await partnerNft.safeMint(account.address);
            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);

            await expectRevert(whitelist.isWhitelist(account.address, [], [0,100,200]), 'ERC721: invalid token ID');
        });


    })

    describe("verify", () => {

        it("reset whitelist", async () => {
            await partnerNft.safeMint(account.address);
            expect((await whitelist.isWhitelist(account.address, [], [0]))[1][0]).to.eq(true);
            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);
            expect((await whitelist.isWhitelist(account.address, [], [0]))[1][0]).to.eq(false);
        });

        it("partner.tokenId is used", async () => {
            await partnerNft.safeMint(account.address);

            let tokenId = await partnerNft.tokenByIndex(0);
            expect(await whitelist.usedPartnerNftIds(tokenId)).to.eq(false);
            await whitelist.verify(account.address, tokenId, TypeNFT.PARTNER);
            expect(await whitelist.usedPartnerNftIds(tokenId)).to.eq(true);
        });

        it("multy whitelist", async () => {
            await partnerNft.safeMint(account.address);
            await partnerNft.safeMint(account.address);
            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);
            await whitelist.verify(account.address, 1, TypeNFT.PARTNER);
        });

        it("already not !whitelist", async () => {
            await partnerNft.safeMint(account.address);
            await whitelist.verify(account.address, 0, TypeNFT.PARTNER);
            await expectRevert(whitelist.verify(account.address, 0, TypeNFT.PARTNER),'!whitelist');
        });

        it("only guarded", async () => {
            await expectRevert(whitelist.connect(firstAccount).verify(account.address, 0, TypeNFT.PARTNER),'only guarded');
        });
    })




});
