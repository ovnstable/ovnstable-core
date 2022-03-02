const {ethers} = require("hardhat");

const fs = require("fs");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const timelockController = await ethers.getContract("TimelockController");
    let address = timelockController.address;

    await grantRevokeRole(await ethers.getContract("UsdPlusToken"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Exchange"), deployer, address);
    await grantRevokeRole(await ethers.getContract("PortfolioManager"), deployer, address);
    await grantRevokeRole(await ethers.getContract("OvnToken"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Mark2Market"), deployer, address);

    await grantRevokeRole(await ethers.getContract("StrategyAave"), deployer, address);
    await grantRevokeRole(await ethers.getContract("StrategyIdle"), deployer, address);
    await grantRevokeRole(await ethers.getContract("StrategyMStable"), deployer, address);
    await grantRevokeRole(await ethers.getContract("StrategyCurve"), deployer, address);
    await grantRevokeRole(await ethers.getContract("StrategyBalancer"), deployer, address);
    await grantRevokeRole(await ethers.getContract("StrategyIzumi"), deployer, address);

};

module.exports.tags = ['permissions'];


async function grantRevokeRole(contract, oldAdmin, newAdmin) {
    let tx = await contract.grantRole(await contract.UPGRADER_ROLE(), newAdmin);
    await tx.wait();
    console.log('Contract:' + contract + '=> Grant role UPGRADER_ROLE to ' + newAdmin + '=> done')

    tx = await contract.revokeRole(await contract.UPGRADER_ROLE(), oldAdmin);
    await tx.wait();
    console.log('Contract:' + contract + '=> Revoke role UPGRADER_ROLE to ' + oldAdmin + '=> done')

    tx = await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), newAdmin);
    await tx.wait();
    console.log('Contract:' + contract + '=> Grant role ADMIN to ' + newAdmin + '=> done')

    tx = await contract.revokeRole(await contract.DEFAULT_ADMIN_ROLE(), oldAdmin);
    await tx.wait();
    console.log('Contract:' + contract + '=> Revoke role ADMIN to ' + oldAdmin + '=> done')

}
