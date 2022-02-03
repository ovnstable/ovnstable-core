const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const curve = await ethers.getContract("CurveStrategies");

    const connectorAAVE = await ethers.getContract("ConnectorAAVE");
    const connectorCurve = await ethers.getContract("ConnectorCurve");

    curve.setParams();


};

module.exports.tags = ['setting','setting-strategies'];

