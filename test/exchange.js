const Exchange = artifacts.require("Exchange");
const USDCtest = artifacts.require("USDCtest");
const Ovn = artifacts.require("OvernightToken");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Exchange", function (accounts) {


    it("Method: buy", async function () {
        let exchange = await Exchange.deployed();
        let ovn = await Ovn.deployed();
        let usdc = await USDCtest.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');

        let account = accounts[0];

        let balanceUSDCBefore = await usdc.balanceOf(account);

        await usdc.approve(Exchange.address, 30);
        await exchange.buy(30)

        let balanceOVN = await ovn.balanceOf(account);
        let balanceUSDC = await usdc.balanceOf(account);

        assert.equal(30, balanceOVN.toNumber())
        assert.equal(balanceUSDCBefore.toNumber()-30, balanceUSDC);
    });

    it("Method: redeem", async function () {
        let exchange = await Exchange.deployed();
        let ovn = await Ovn.deployed();
        let usdc = await USDCtest.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');

        let account = accounts[0];

        await usdc.approve(Exchange.address, 30);

        let balanceOVNBefore = await ovn.balanceOf(account);
        let balanceUSDCBefore = await usdc.balanceOf(account);

        await exchange.buy(30)

        let balanceOVN = await ovn.balanceOf(account);
        let balanceUSDC = await usdc.balanceOf(account);

        assert.equal(balanceOVNBefore.toNumber()+30, balanceOVN)
        assert.equal(balanceUSDCBefore.toNumber()-30, balanceUSDC);

        await exchange.redeem(30)

        balanceOVN = await ovn.balanceOf(account);
        balanceUSDC = await usdc.balanceOf(account);

        assert.equal(balanceOVNBefore.toNumber(), balanceOVN.toNumber())
        assert.equal(balanceUSDCBefore.toNumber(), balanceUSDC.toNumber());
    });
});
