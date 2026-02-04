const { transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    if (hre.network.name === "localhost") {
        await transferETH(1, await getWalletAddress());
    }

    await deploy("DystSwap", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: false
    });

    let dystSwap = await ethers.getContract("DystSwap");

    console.log("DystSwap deploy done()");
    console.log("Address:     " + dystSwap.address);
};

module.exports.tags = ["polygon", "DystSwap"];