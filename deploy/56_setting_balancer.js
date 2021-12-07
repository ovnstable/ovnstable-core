const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancer = await ethers.getContract("Balancer");
    const m2m = await ethers.getContract("Mark2Market");

    // setup balancer
    console.log("balancer.setMark2Market: " + m2m.address)
    let tx = await balancer.setMark2Market(m2m.address);
    await tx.wait();
    console.log("balancer.setMark2Market done")

};

module.exports.tags = ['setting','Setting'];
