const Vault = artifacts.require("Vault")
const PortfolioManager = artifacts.require("PortfolioManager")
const ERC20 = artifacts.require("ERC20")
const IERC20Metadata = artifacts.require("IERC20Metadata")


module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];

        console.log("userAccount: " + userAccount);
        let oldVault = await Vault.at("0xDfE7686F072013f78F94709DbBE528bFC864009C");
        let newVault = await Vault.at("0xCAa044679c075AA25242FfcCf4d237Cc1e0CAb9C");

        let wmatic = await ERC20.at('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
        let amUSDC = await ERC20.at('0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
        let USDC = await ERC20.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
        let am3CRV = await ERC20.at('0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
        let am3CRVGauge = await ERC20.at('0x19793b454d3afc7b454f206ffe95ade26ca6912c');
        let CRV = await ERC20.at('0x172370d5Cd63279eFa6d502DAB29171933a610AF');

        let assets = [USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic];


        console.log('OLD Vault: ' + oldVault.address)
        await showBalances(assets, oldVault)

        console.log('')
        console.log('NEW Vault: ' + newVault.address)
        await showBalances(assets, newVault)

        console.log('')
        console.log('Start transferring...')
        await moveBalances(assets, oldVault, newVault)

        console.log('')
        console.log('Finish transferring...')
        console.log('')

        console.log('OLD Vault: ' + oldVault.address)
        await showBalances(assets, oldVault)

        console.log('')
        console.log('NEW Vault: ' + newVault.address)
        await showBalances(assets, newVault)

    } catch (error) {
        console.log(error);

    }
    callback();
}

async function moveBalances(assets, oldVault, newVault){

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        await oldVault.transfer(asset, newVault.address, await asset.balanceOf(oldVault.address))
    }

}

async function showBalances(assets, vault){

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];

        let meta = await IERC20Metadata.at(asset.address);

        console.log(`Balance: ${await asset.symbol()}: ` + (await asset.balanceOf(vault.address) / 10 ** await meta.decimals()));

    }

}
