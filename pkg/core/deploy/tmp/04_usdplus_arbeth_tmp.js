const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { upgrades, ethers } = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    try {
        const proxy = await getContract("UsdPlusToken");
        const baseFactory = await ethers.getContractFactory("UsdPlusTokenV1");
        await upgrades.forceImport(proxy.address, baseFactory, { kind: "uups" });
        console.log(`forceImport done for ${proxy.address}`);
    } catch (e) {
        console.log("forceImport skipped:", e.message);
    }

    const impl = await deployProxyMulti(
        "UsdPlusToken",
        "UsdPlusToken_ArbEth_Tmp",
        deployments,
        deployments.save,
        { unsafeAllow: ["delegatecall", "constructor", "state-variable-immutable"] }
    );
    console.log(`UsdPlusToken_ArbEth_Tmp impl: ${impl}`);
};

module.exports.tags = ["UsdPlusTokenArbEthTmp"];
