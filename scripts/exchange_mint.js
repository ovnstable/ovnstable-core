const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic} = require("../utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let Vault = JSON.parse(fs.readFileSync('./deployments/polygon/Vault.json'));
let ConnectorMStable = JSON.parse(fs.readFileSync('./deployments/polygon/ConnectorMStable.json'));
let Balancer = JSON.parse(fs.readFileSync('./deployments/polygon/Balancer.json'));
let Portfolio = JSON.parse(fs.readFileSync('./deployments/polygon/Portfolio.json'));
let assets = JSON.parse(fs.readFileSync('./assets.json'));

async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let connectorMstable = await ethers.getContractAt(ConnectorMStable.abi, ConnectorMStable.address,wallet );
    let vault = await ethers.getContractAt(Vault.abi, Vault.address, wallet);
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', wallet);


    // await connectorMstable.grantRole(await connectorMstable.TOKEN_EXCHANGER(), "0x7ca3f0e1eb62fbc8b233a4295596e822cdd50055");
    // await connectorMstable.grantRole(await connectorMstable.TOKEN_EXCHANGER(), "0x0790733155cf51ab2e5d2741f9fc9c4a8ca29e19");
    // let newVar = await connectorMstable.hasRole(await connectorMstable.TOKEN_EXCHANGER(), "0x7ca3f0e1eb62fbc8b233a4295596e822cdd50055");
    // newVar = await connectorMstable.hasRole(await connectorMstable.TOKEN_EXCHANGER(), "0x0790733155cf51ab2e5d2741f9fc9c4a8ca29e19");
    // console.log('Exchanger has role ' + newVar)

    console.log('Balance Vault');
    await showBalances(vault.address);
    console.log('\nBalance User');
    await showBalances(wallet.address);

    let balanceUSDC = await USDC.balanceOf(wallet.address);
    await USDC.approve(exchange.address, balanceUSDC);
    await exchange.buy(USDC.address, balanceUSDC);
    // await exchange.payout();



    console.log('Balance Vault');
    await showBalances(vault.address);
    console.log('\nBalance User');
    await showBalances(wallet.address);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




async function showBalances(user){

    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
    let am3CRV = await ethers.getContractAt(ERC20.abi, '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi, '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi, '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
    let wmatic = await ethers.getContractAt(ERC20.abi, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let vimUsd = await ethers.getContractAt(ERC20.abi, '0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29');
    let mta = await ethers.getContractAt(ERC20.abi, '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, vimUsd, mta];

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(user) / 10 ** await meta.decimals()));
    }
}
