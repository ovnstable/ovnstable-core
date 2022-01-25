const { ethers } = require("hardhat");
const fs = require("fs");

let aaveAddress = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744";
let balancerVault = "0xba12222222228d8ba445958a75a0704d566bf2c8";
let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351";
let idleToken = "0x1ee6470CD75D5686d0b2b90C0305Fa46fb0C89A1";
let merkleOrchard = "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e";

let assets = JSON.parse(fs.readFileSync('./assets.json'));


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connAAVE = await ethers.getContract("ConnectorAAVE");
    const connBalancer = await ethers.getContract("ConnectorBalancer");
    const connCurve = await ethers.getContract("ConnectorCurve");
    const connIDLE = await ethers.getContract("ConnectorIDLE");
    const connMStable = await ethers.getContract("ConnectorMStable");

    const vault = await ethers.getContract("Vault");
    const tokenExchanger = await ethers.getContract("Usdc2VimUsdTokenExchange");
    const pm = await ethers.getContract("PortfolioManager");


    console.log("connAAVE.setLpap: " + aaveAddress);
    let tx = await connAAVE.setLpap(aaveAddress);
    await tx.wait();
    console.log("connAAVE.setLpap done");

    console.log("connBalancer.setBalancerVault: " + balancerVault);
    tx = await connBalancer.setBalancerVault(balancerVault);
    await tx.wait();
    console.log("connBalancer.setBalancerVault done");

    console.log("connBalancer.setMerkleOrchard: " + merkleOrchard);
    tx = await connBalancer.setMerkleOrchard(merkleOrchard);
    await tx.wait();
    console.log("connBalancer.setMerkleOrchard done");

    console.log("connCurve.setPool: " + aCurvepoolStake);
    tx = await connCurve.setPool(aCurvepoolStake);
    await tx.wait();
    console.log("connCurve.setPool done");

    console.log("connIDLE.setIdleToken: " + idleToken);
    tx = await connIDLE.setIdleToken(idleToken);
    await tx.wait();
    console.log("connIDLE.setIdleToken done");

    tx = await connMStable.setParameters(vault.address, assets.mUsd, assets.imUsd, assets.vimUsd, assets.mta, assets.wMatic);
    await tx.wait();
    console.log("connMStable.setParameters done");

    tx =  await connMStable.grantRole(await connMStable.TOKEN_EXCHANGER(), tokenExchanger.address);
    await tx.wait();
    console.log("connMStable.grantRole(TOKEN_EXCHANGER) done");

    tx =  await connMStable.grantRole(await connMStable.PORTFOLIO_MANAGER(), pm.address);
    await tx.wait();
    console.log("connMStable.grantRole(PORTFOLIO_MANAGER) done");

};

module.exports.tags = ['setting','Connectors'];
module.exports.dependencies = ['Usdc2VimUsdTokenExchange'];
