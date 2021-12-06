const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic} = require("../utils/decimals");
const ethers = hre.ethers;


let ERC20 = JSON.parse(fs.readFileSync('./deployments/old_polygon/ERC20.json'));
let OVN = JSON.parse(fs.readFileSync('./deployments/old_polygon/OvernightToken.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./deployments/old_polygon/IERC20Metadata.json'));
let OldVault = JSON.parse(fs.readFileSync('./deployments/old_polygon/Vault.json'));


async function main() {


    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet("", provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let newVault = await ethers.getContract("Vault");
    let portfolioManager = await ethers.getContract("PortfolioManager");
    let exchange = await ethers.getContract("Exchange");
    let ovn = await ethers.getContractAt(OVN.abi, "0xcE5bcF8816863A207BF1c0723B91aa8D5B9c6614", wallet);

    let oldVault = await ethers.getContractAt(OldVault.abi, "0xDfE7686F072013f78F94709DbBE528bFC864009C", wallet);


    console.log('Old vault address: ' + oldVault.address)
    console.log('new vault address: ' + newVault.address)


    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let wmatic = await ethers.getContractAt(ERC20.abi,'0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let amUSDC = await ethers.getContractAt(ERC20.abi,'0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
    let USDC = await ethers.getContractAt(ERC20.abi,'0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let am3CRV = await ethers.getContractAt(ERC20.abi,'0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi,'0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi,'0x172370d5Cd63279eFa6d502DAB29171933a610AF');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic];


    // await exchange.setTokens(ovn.address, USDC.address);
    // console.log('Setting exchange done')
    //
    // await ovn.setExchanger(exchange.address);
    // console.log('Setting ovn done')


    console.log('')
    console.log('OLD Vault: ' + oldVault.address)
    await showBalances(assets, oldVault)

    console.log('')
    console.log('NEW Vault: ' + newVault.address)
    await showBalances(assets, newVault)

    console.log('')
    console.log('Start transferring...')
    // await moveBalances(assets, oldVault, newVault, wallet.address, portfolioManager)

    console.log('')
    console.log('Finish transferring...')
    console.log('')

    console.log('OLD Vault: ' + oldVault.address)
    await showBalances(assets, oldVault)

    console.log('')
    console.log('NEW Vault: ' + newVault.address)
    await showBalances(assets, newVault)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



async function moveBalances(assets, oldVault, newVault, signer, portfolioManager){

    await oldVault.setPortfolioManager(signer);

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        let address = asset.address;
        let balance =await asset.balanceOf(oldVault.address);
        await oldVault.transfer(address, newVault.address, balance);
    }

    await oldVault.setPortfolioManager(portfolioManager.address);
}

async function showBalances(assets, vault){

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];

        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);

        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(vault.address) / 10 ** await meta.decimals()));

    }

}
