const { ethers } = require("hardhat");

const fs = require("fs");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();



};

module.exports.tags = ['permissions'];

