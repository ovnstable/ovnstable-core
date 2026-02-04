const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    
    const stand = hre.ovn?.stand || process.env.STAND;
    
    // Only run for blast networks
    if (stand !== 'blast' && stand !== 'blast_usdc') {
        console.log(`Skipping Blast UsdPlusTokenV1 deployment for ${stand}`);
        return;
    }
    
    if (hre.network.name === "localhost") {
        await transferETH(1, await getWalletAddress());
    }

    console.log(`Deploying Blast UsdPlusTokenV1 implementation for ${stand}...`);
    
    hre.ovn = hre.ovn || {};
    hre.ovn.impl = true;
    
    // Skip storage check on localhost fork (old implementation not in cache)
    let params = {};
    if (hre.network.name === "localhost") {
        console.log('[Localhost] Skipping storage validation for old implementation...');
        params.unsafeSkipStorageCheck = true;
        params.unsafeAllowRenames = true;
    }
    
    let result = await deployProxyMulti(
        "UsdPlusToken", 
        "contracts/blast/UsdPlusTokenV1.sol:UsdPlusTokenV1", 
        deployments, 
        save, 
        params
    );
    
    console.log("Implementation deployed!");
    console.log("Implementation address:", result.implementation);

    let proxy = await ethers.getContract("UsdPlusToken");
    console.log("\nProxy address: " + proxy.address);
    console.log("Symbol:        " + (await proxy.symbol()));
    console.log("Name:          " + (await proxy.name()));
    console.log("Decimals:      " + (await proxy.decimals()));
    console.log("totalSupply:   " + (await proxy.totalSupply()));
};

module.exports.tags = ["UsdPlusTokenV1"];

