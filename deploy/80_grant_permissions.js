const {ethers} = require("hardhat");

const fs = require("fs");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const timelockController = await ethers.getContract("TimelockController");
    let address = timelockController.address;

    await grantRevokeRole(await ethers.getContract("UsdPlusToken"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Vault"), deployer, address);

    await grantRevokeRole(await ethers.getContract("Exchange"), deployer, address);
    await grantRevokeRole(await ethers.getContract("PortfolioManager"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Balancer"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Portfolio"), deployer, address);
    await grantRevokeRole(await ethers.getContract("RewardManager"), deployer, address);
    await grantRevokeRole(await ethers.getContract("OvnToken"), deployer, address);
    await grantRevokeRole(await ethers.getContract("Mark2Market"), deployer, address);

    await transferOwnership(await ethers.getContract("ConnectorAAVE"), address);
    await transferOwnership(await ethers.getContract("ConnectorCurve"), address);
    await transferOwnership(await ethers.getContract("ConnectorIDLE"), address);
    await transferOwnership(await ethers.getContract("ConnectorMStable"), address);

};

module.exports.tags = ['permissions'];


async function transferOwnership(contract, newAdmin) {

    let tx = await contract.transferOwnership(newAdmin);
    await tx.wait();
    console.log('Contract:' + contract + '=> Transfer ownership to ' + newAdmin + '=> done')

}

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
