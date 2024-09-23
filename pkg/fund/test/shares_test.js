const {expect} = require("chai");
const {utils, BigNumber, providers} = require("ethers");
const hre = require('hardhat');
const {getNamedAccounts, deployments, ethers} = require("hardhat");
const {createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const {fromE18, fromE6, toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { initWallet, transferAsset, getERC20, transferETH, getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { Roles } = require("@overnight-contracts/common/utils/roles");


describe("Token", function () {

    let fund;
    let account;
    let rm;

    let user1;
    let user2;
    let user3;

    let nonRebaseUser1;
    let nonRebaseUser2;

    let fromAsset;
    let toAsset;

    let wallet;

    sharedBeforeEach(async () => {
        await hre.run("compile");

        wallet = await initWallet();

        const { deployer } = await getNamedAccounts();
        await deployments.fixture(["FundExchange", "MotivationalFund", "RoleManager"]);
        account = deployer;
        
        user1 = await createRandomWallet();
        user2 = await createRandomWallet();
        user3 = await createRandomWallet();
        nonRebaseUser1 = await createRandomWallet();
        nonRebaseUser2 = await createRandomWallet();
        fund = await ethers.getContract("MotivationalFund", deployer);
        exchange = await ethers.getContract("FundExchange", deployer);
        // rm = await ethers.getContract("RoleManager", deployer);
        rm = await getContract('RoleManager', 'arbitrum');
        
        await transferAsset(ARBITRUM.usdcCircle, deployer);
        await transferETH(100, wallet.address);
        
        let usdcCircle = await getERC20("usdcCircle");
        await usdcCircle.approve(deployer, toE6(10000000));

        await fund.setExchanger(account);
        await fund.setRoleManager(rm.address);
        await execTimelock(async timelock => {
            await rm.connect(timelock).grantRole(Roles.DEPOSITOR_ROLE, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")});
        
        console.log(await rm.hasRole(Roles.DEPOSITOR_ROLE, account));
        // await rm.grantRole(Roles.DEPOSITOR_ROLE, account);
        await exchange.setTokens(ARBITRUM.fund, ARBITRUM.usdcCircle);

        let decimals = await fund.decimals();
        
        fromAsset = decimals === 18 ? fromE18 : fromE6;
        toAsset = decimals === 18 ? toE18 : toE6;
    });

    // async function transfer(from, to, amount) {
    //     await fund.connect(from).transfer(to.address, toAsset(amount));
    // }

    async function deposit(amount) {
        await exchange.deposit(ARBITRUM.usdcCircle, toE6(amount)); 
    }

    async function mint(user, amount) {
        await fund.mint(user.address, toAsset(amount));
    }

    async function balanceOf(user, amount) {
        let balanceValue = await fund.balanceOf(user.address);
        let balance = Math.ceil(fromAsset(balanceValue));
        expect(balance).to.eq(amount);
    }

    async function sharesOf(user, amount) {
        let sharesValue = await fund.sharesBalanceOf(user.address);
        // let shares = Math.ceil(sharesValue);
        expect(sharesValue).to.eq(amount);
    }

    async function giveShares(user, amount) {
        await fund.giveShares(user.address, toAsset(amount));
    }

    async function totalSupply(amount) {
        let totalSupply = await fund.totalSupply();
        expect(fromAsset(totalSupply)).to.eq(amount);
    }

    async function changeTotalSupply(amount, deposit) {
        await fund.changeSupply(toAsset(amount), toAsset(deposit));
    }


    it("Should return the token name and symbol", async () => {
        console.log(fund.name());
        expect(await fund.name()).to.equal("MotivationalFund");
        expect(await fund.symbol()).to.equal("FUND");
    });

    it("Should have 6 decimals", async () => {
        expect(await fund.decimals()).to.equal(6);
    });

    it("Should return 0 balance for the zero address", async () => {
        expect(
            await fund.balanceOf("0x0000000000000000000000000000000000000000")
        ).to.equal(0);
    });

    it("Should not allow anyone to mint FUND directly", async () => {
        await expectRevert(
            fund.connect(user1).mint(user1.address, toAsset(100)), "Caller is not the EXCHANGER")
    });

    // it("Should allow deposit", async () => {
    //     await deposit(100);
    // });

    it("Should allow a simple transfer of 1 share", async () => {
        await fund.giveShares(user2.address, 100);
        await sharesOf(user1, 0);
        await sharesOf(user2, 100);
        await fund.connect(user2).transferShares(user1.address, 1);
        await sharesOf(user1, 1);
        await sharesOf(user2, 99);
    });

    it("Should allow a simple transfer of 1 FUND", async () => {
        await fund.mint(user2.address, toAsset(100));
        await balanceOf(user1, 0);
        await balanceOf(user2, 100);
        await fund.connect(user2).transfer(user1.address, toAsset(1));
        await balanceOf(user1, 1);
        await balanceOf(user2, 99);
    });

    it("Should allow a transferFrom with an allowance", async () => {
        await fund.mint(user1.address, toAsset(1000));

        await fund.connect(user1).approve(user2.address, toAsset(1000));
        expect(await fund.allowance(user1.address, user2.address)).to.eq(toAsset(1000));

        await fund.connect(user2).transferFrom(user1.address, user2.address, toAsset(1));
        await balanceOf(user2, 1);
        expect(await fund.allowance(user1.address, user2.address)).to.eq(toAsset(999));

    });


    it('Should return correct balance for small amounts at mint/burn', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await fund.mint(user1.address, amount);
            expect(fund.balanceOf(user1.address), amount);
            await fund.burn(user1.address, amount);
            expect(fund.balanceOf(user1.address), '0');
        }

    });

    it('Should return correct shares balance for small amounts at give/burn shares', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await fund.giveShares(user1.address, amount);
            await sharesOf(user1, amount);
            await fund.burnShares(user1.address, amount);
            await sharesOf(user1, 0);
        }

    });

    it('Should return correct balance for small amounts at mint/burn after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user2, 12345);
        await changeTotalSupply(12543, 0);

        for (const amount of amounts) {
            await fund.mint(user1.address, amount);
            expect(fund.balanceOf(user1.address), amount);
            await fund.burn(user1.address, amount);
            expect(fund.balanceOf(user1.address), '0');
        }
    });

    it("Should maintain correct share-to-balance ratio after multiple rebases with deposits", async () => {
        await fund.giveShares(user1.address, 1);
        await fund.giveShares(user2.address, 4);
    
        await sharesOf(user1, 1);
        await sharesOf(user2, 4);
    
        
        await fund.mint(user1.address, toAsset(500)); 
        await changeTotalSupply(1500, 500);
        await balanceOf(user1, 800); 
        await balanceOf(user2, 200); 
    
        
        await changeTotalSupply(2100, 500);
        await balanceOf(user1, 1160); 
        await balanceOf(user2, 440); 
    
        await sharesOf(user1, 1);
        await sharesOf(user2, 4);
    });

    it('Should return correct balance for small amounts at transfer', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await fund.mint(user1.address, amount);
            expect(fund.balanceOf(user1.address), amount);
            await fund.connect(user1).transfer(user2.address, amount);
            expect(fund.balanceOf(user2.address), amount);
            expect(fund.balanceOf(user1.address), '0');
            await fund.burn(user2.address, amount);
            expect(fund.balanceOf(user2.address), '0');
        }
    });

    it('Should return correct shares balance for small amounts at transfer shares', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        for (const amount of amounts) {
            await fund.giveShares(user1.address, amount);
            await sharesOf(user1, amount);
            await fund.connect(user1).transferShares(user2.address, amount);
            await sharesOf(user2, amount);
            await sharesOf(user1, '0');
            await fund.burnShares(user2.address, amount);
            await sharesOf(user1, '0');
        }
    });


    it('Should return correct balance for small amounts at transfer after shifted rebasingCreditsPerToken', async ()=>{

        let amounts = ['100000000000', '10000000000', '1000000000', '100000000', '10000000', '1000000', '100000', '10000', '1000', '100', '10', '1'];

        await mint(user3, 12345);
        await changeTotalSupply(12543, 0);

        for (const amount of amounts) {
            await fund.mint(user1.address, amount);
            expect(fund.balanceOf(user1.address), amount);
            await fund.connect(user1).transfer(user2.address, amount);
            expect(fund.balanceOf(user2.address), amount);
            expect(fund.balanceOf(user1.address), '0');
            await fund.burn(user2.address, amount);
            expect(fund.balanceOf(user2.address), '0');

        }

    });

    it("Should return correct balance for shares user and for base user", async () => {

        await fund.mint(user1.address, toAsset(100));
        await fund.giveShares(user2.address, 100);

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);

        await sharesOf(user1, 0);
        await sharesOf(user2, 100);

        // Make rebase
        await fund.changeSupply(toAsset(250), toAsset(100));

        await balanceOf(user1, 125);
        await balanceOf(user2, 25);
    });

    
    it("Should return correct balance for shares user and for base user v2", async () => {

        await fund.mint(user1.address, toAsset(100));
        await fund.giveShares(user2.address, 100);

        await balanceOf(user1, 100);
        await balanceOf(user2, 0);

        await sharesOf(user1, 0);
        await sharesOf(user2, 100);

        // Make rebase
        await fund.changeSupply(toAsset(250), toAsset(100));

        await balanceOf(user1, 125);
        await balanceOf(user2, 25);

        await fund.changeSupply(toAsset(500), toAsset(100));

        await balanceOf(user1, 250);
        await balanceOf(user2, 150);
    });

    it("Should handle correct share calculations on multiple transfers", async () => {
        await fund.giveShares(user2.address, 500);
        await sharesOf(user2, 500);
    
        await fund.connect(user2).transferShares(user1.address, 250);
        await sharesOf(user2, 250);
        await sharesOf(user1, 250);
    
        await fund.connect(user1).transferShares(user2.address, 125);
        await sharesOf(user1, 125);
        await sharesOf(user2, 375);
    
        let totalShares = await fund.totalShares();
        expect(totalShares).to.eq(500);
    });
    

    it("Should distribute rebased supply proportionally based on shares with deposits", async () => {
        
        await fund.giveShares(user1.address, 400);
        await fund.giveShares(user2.address, 600);
    
        await sharesOf(user1, 400);
        await sharesOf(user2, 600);
    
        await fund.mint(user1.address, toAsset(100)); 
        await balanceOf(user1, 100); 
    
        await changeTotalSupply(1500, 500);
    
        await balanceOf(user1, 550); 
        await balanceOf(user2, 450); 
    });

    
    it("Should revert a transferFrom if an allowance is insufficient", async () => {
        await mint(user1, 100);

        await fund.connect(user1).approve(user2.address, toAsset(10));
        expect(await fund.allowance(user1.address, user2.address)).to.equal(toAsset(10));
        await expectRevert(fund.connect(user2).transferFrom(user1.address, user2.address, toAsset(100)), "Allowance amount exceeds balance");
    });

    it("Should allow to increase/decrease allowance", async () => {
        await mint(user1, 1000);

        await fund.connect(user1).approve(user2.address, toAsset(1000));
        expect(await fund.allowance(user1.address, user2.address)).to.equal(toAsset(1000));

        await fund.connect(user1).decreaseAllowance(user2.address, toAsset(100));
        expect(await fund.allowance(user1.address, user2.address)).to.equal(toAsset(900));

        await fund.connect(user1).increaseAllowance(user2.address, toAsset(20));
        expect(await fund.allowance(user1.address, user2.address)).to.equal(toAsset(920));

        // Decrease allowance more than what's there
        await fund.connect(user1).decreaseAllowance(user2.address, toAsset(950));
        expect(await fund.allowance(user1.address, user2.address)).to.equal(toAsset(0));

    });

    it("Should increase users balance on supply increase", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        await changeTotalSupply(102, 0);

        let balanceUser1 = fromAsset(await fund.balanceOf(user1.address));
        let balanceUser2 = fromAsset(await fund.balanceOf(user2.address));

        expect(balanceUser1).to.eq(100.98);
        expect(balanceUser2).to.eq(1.02);
    });


  it("Should exact transfer to new contract accounts", async () => {

    // Add yield to so we need higher resolution
    await mint(user1, 125);

    // Helper to verify balance-exact transfers in
    const checkTransferIn = async (amount) => {
      const beforeReceiver = await fund.balanceOf(nonRebaseUser1.address);
      await fund.connect(user1).transfer(nonRebaseUser1.address, amount);
      const afterReceiver = await fund.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.add(amount)).to.equal(afterReceiver);
    };

    // Helper to verify balance-exact transfers out
    const checkTransferOut = async (amount) => {
      const beforeReceiver = await fund.balanceOf(nonRebaseUser1.address);
      await fund.connect(nonRebaseUser1).transfer(user1.address, amount);
      const afterReceiver = await fund.balanceOf(nonRebaseUser1.address);
      expect(beforeReceiver.sub(amount)).to.equal(afterReceiver);
    };

    // In
    await checkTransferIn(1);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);
    await checkTransferIn(100);
    await checkTransferIn(2);
    await checkTransferIn(5);
    await checkTransferIn(9);

    // Out
    await checkTransferOut(1);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
    await checkTransferOut(100);
    await checkTransferOut(2);
    await checkTransferOut(5);
    await checkTransferOut(9);
  });

    it("assetToCredit converts asset", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};
        let amount06 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount07 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};

        expect(await fund.assetToCredit(amount01.amount)).to.eq(amount01.credit);
        expect(await fund.assetToCredit(amount02.amount)).to.eq(amount02.credit);
        expect(await fund.assetToCredit(amount03.amount)).to.eq(amount03.credit);
        expect(await fund.assetToCredit(amount04.amount)).to.eq(amount04.credit);
        expect(await fund.assetToCredit(amount05.amount)).to.eq(amount05.credit);
        expect(await fund.assetToCredit(amount06.amount)).to.eq(amount06.credit);
        expect(await fund.assetToCredit(amount07.amount)).to.eq(amount07.credit);

        await changeTotalSupply(102, 0);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};
        let amount16 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount17 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};

        expect(await fund.assetToCredit(amount11.amount)).to.eq(amount11.credit);
        expect(await fund.assetToCredit(amount12.amount)).to.eq(amount12.credit);
        expect(await fund.assetToCredit(amount13.amount)).to.eq(amount13.credit);
        expect(await fund.assetToCredit(amount14.amount)).to.eq(amount14.credit);
        expect(await fund.assetToCredit(amount15.amount)).to.eq(amount15.credit);
        expect(await fund.assetToCredit(amount16.amount)).to.eq(amount16.credit);
        expect(await fund.assetToCredit(amount17.amount)).to.eq(amount17.credit);
    });

    it("creditToAsset converts credit", async () => {

        await mint(user1, 99);
        await mint(user2, 1);

        let amount01 = {amount: "1",             credit: "1000000000"};
        let amount02 = {amount: "1000",          credit: "1000000000000"};
        let amount03 = {amount: "1000000",       credit: "1000000000000000"};
        let amount04 = {amount: "1000000000",    credit: "1000000000000000000"};
        let amount05 = {amount: "1000000000000", credit: "1000000000000000000000"};
        let amount06 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount07 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913"};

        expect(await fund.creditToAsset(amount01.credit)).to.eq(amount01.amount);
        expect(await fund.creditToAsset(amount02.credit)).to.eq(amount02.amount);
        expect(await fund.creditToAsset(amount03.credit)).to.eq(amount03.amount);
        expect(await fund.creditToAsset(amount04.credit)).to.eq(amount04.amount);
        expect(await fund.creditToAsset(amount05.credit)).to.eq(amount05.amount);
        expect(await fund.creditToAsset(amount06.credit)).to.eq(amount06.amount);
        expect(await fund.creditToAsset(amount07.credit)).to.eq(amount07.amount);

        await changeTotalSupply(102, 0);

        let amount11 = {amount: "1",             credit: "980392157"};
        let amount12 = {amount: "1000",          credit: "980392156863"};
        let amount13 = {amount: "1000000",       credit: "980392156862745"};
        let amount14 = {amount: "1000000000",    credit: "980392156862745098"};
        let amount15 = {amount: "1000000000000", credit: "980392156862745098039"};
        let amount16 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913129639935"};
        let amount17 = {amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935", credit: "115792089237316195423570985008687907853269984665640564039457584007913"};

        expect(await fund.creditToAsset(amount11.credit)).to.eq(amount11.amount);
        expect(await fund.creditToAsset(amount12.credit)).to.eq(amount12.amount);
        expect(await fund.creditToAsset(amount13.credit)).to.eq(amount13.amount);
        expect(await fund.creditToAsset(amount14.credit)).to.eq(amount14.amount);
        expect(await fund.creditToAsset(amount15.credit)).to.eq(amount15.amount);
        expect(await fund.creditToAsset(amount16.credit)).to.eq(amount16.amount);
        expect(await fund.creditToAsset(amount17.credit)).to.eq(amount17.amount);
    });

    it("subCredits work correct", async () => {

        let amount1 = {credit1: "2000000000",       credit2: "1000000000",             error: "errorText", result: "1000000000"};
        let amount2 = {credit1: "1000000000000",    credit2: "1000000",                error: "errorText", result: "999999000000"};
        let amount3 = {credit1: "1000000000000000", credit2: "1000000000012345",       error: "errorText", result: "0"};
        let amount4 = {credit1: "1000000000012345", credit2: "1000000000000000",       error: "errorText", result: "12345"};
        let amount5 = {credit1: "1000000000000000", credit2: "1000000000000000",       error: "errorText", result: "0"};
        let amount6 = {credit1: "1000000000000",    credit2: "1000000000000000000000", error: "errorText", result: "errorText"};

        expect(await fund.subCredits(amount1.credit1, amount1.credit2, amount1.error)).to.eq(amount1.result);
        expect(await fund.subCredits(amount2.credit1, amount2.credit2, amount2.error)).to.eq(amount2.result);
        expect(await fund.subCredits(amount3.credit1, amount3.credit2, amount3.error)).to.eq(amount3.result);
        expect(await fund.subCredits(amount4.credit1, amount4.credit2, amount4.error)).to.eq(amount4.result);
        expect(await fund.subCredits(amount5.credit1, amount5.credit2, amount5.error)).to.eq(amount5.result);
        await expectRevert(fund.subCredits(amount6.credit1, amount6.credit2, amount6.error), amount6.result);
    });

    it("Approve/allowance different numbers", async () => {

        let amounts0 = [
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // max
            "115792089237316195423570985008687907853269984665640564039457584007913", // max / 1e9
            "115792089237316195423570985008687907853269984665640564039457", // max / 1e18
            "115792089237316195423570985008687907853269984665640", // max / 1e27
            "115792089237316195423570985008687907853269", // max / 1e36
            "115792089237316195423570985008688", // max / 1e45 + 1
        ];

        let amounts1 = [
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", // max / 1e45
            "115792089237316195423570", // max / 1e54
            "115792089237316", // max / 1e63
            "115792", // max / 1e72
            "1"
        ];

        for (const amount of amounts0) {
            await fund.connect(user1).approve(user2.address, amount);
            expect(await fund.allowance(user1.address, user2.address)).to.eq(amounts0[0]);
        }

        for (const amount of amounts1) {
            await fund.connect(user1).approve(user2.address, amount);
            expect(await fund.allowance(user1.address, user2.address)).to.eq(amount);
        }

    });

    it("Approve large number and transferFrom", async () => {

        let amount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        await mint(user1, 1000000);
        await fund.connect(user1).approve(user2.address, amount);
        expect(await fund.allowance(user1.address, user2.address)).to.eq(amount);
        await fund.connect(user2).transferFrom(user1.address, user2.address, 1000000);
        expect(await fund.allowance(user1.address, user2.address)).to.eq(amount);

    });

});
