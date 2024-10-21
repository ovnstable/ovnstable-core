const hre = require("hardhat");
const { getContract, transferETH, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { BASE } = require('@overnight-contracts/common/utils/assets');
const { strategySiloUsdcUsdPlusParams } = require('@overnight-contracts/strategies-base/deploy/28_strategy_silo_usdc_wUSDPlus');
const { strategySiloUsdcCbBTCParams } = require('@overnight-contracts/strategies-base/deploy/29_strategy_silo_usdc_cbBTC');
const { strategySiloUsdcWstETHParams } = require('@overnight-contracts/strategies-base/deploy/30_strategy_silo_usdc_wstETH');
const { strategySiloUsdcCbETHParams } = require('@overnight-contracts/strategies-base/deploy/31_strategy_silo_usdc_cbETH');

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    const StrategySiloUsdcUsdPlus = await getContract('StrategySiloUsdcUsdPlus', 'base');
    const StrategySiloUsdcCbBTC = await getContract('StrategySiloUsdcCbBTC', 'base');
    const StrategySiloUsdcWstETH = await getContract('StrategySiloUsdcWstETH', 'base');
    const StrategySiloUsdcCbETH = await getContract('StrategySiloUsdcCbETH', 'base');

    // Localhost impersonate begin (for test)
/*
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    const adminAddress = "0x8ab9012d1bff1b62c2ad82ae0106593371e6b247";
    await transferETH(1, adminAddress);
    if (hre.network.name === 'localhost') {
        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    }
    await sleep(1000);
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [adminAddress] });

    const adminAccount = await hre.ethers.getSigner(adminAddress);    
    const myAddress = (await initWallet()).address;

    const grantRole = async (strategy) => {
        await (await strategy.connect(adminAccount).grantRole(await strategy.DEFAULT_ADMIN_ROLE(), myAddress)).wait();
    };

    await grantRole(StrategySiloUsdcUsdPlus);
    await grantRole(StrategySiloUsdcCbBTC);
    await grantRole(StrategySiloUsdcWstETH);
    await grantRole(StrategySiloUsdcCbETH);

    await hre.network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [adminAddress] });
    console.log("role granted");
*/
    // Localhost impersonate end

    let addresses = [];
    let values = [];
    let abis = [];

    console.log(`StrategySiloUsdcUsdPlus wethUsdcPool before: ${(await StrategySiloUsdcUsdPlus.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcCbBTC wethUsdcPool before: ${(await StrategySiloUsdcCbBTC.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcWstETH wethUsdcPool before: ${(await StrategySiloUsdcWstETH.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcCbETH wethUsdcPool before: ${(await StrategySiloUsdcCbETH.wethUsdcPool()).toString()}`);
    
    // we update pool to the one with more liquidity.
    const wethUsdcPool = "0xcDAC0d6c6C59727a65F871236188350531885C43"; // vAMM-WETH/USDC Basic Volatile 0.3%

    addProposalItem(StrategySiloUsdcUsdPlus, "setParams", [{...(await strategySiloUsdcUsdPlusParams()), wethUsdcPool }]);
    addProposalItem(StrategySiloUsdcCbBTC, "setParams", [{ ...(await strategySiloUsdcCbBTCParams()), wethUsdcPool }]);
    addProposalItem(StrategySiloUsdcWstETH, "setParams", [{ ...(await strategySiloUsdcWstETHParams()), wethUsdcPool }]);
    addProposalItem(StrategySiloUsdcCbETH, "setParams", [{ ...(await strategySiloUsdcCbETHParams()), wethUsdcPool }]);

    //await testProposal(addresses, values, abis);
    
    await createProposal(filename, addresses, values, abis);

    console.log(`StrategySiloUsdcUsdPlus wethUsdcPool after: ${(await StrategySiloUsdcUsdPlus.wethUsdcPool()).toString()} silo: ${(await StrategySiloUsdcUsdPlus.silo()).toString()}`);
    console.log(`StrategySiloUsdcCbBTC wethUsdcPool after: ${(await StrategySiloUsdcCbBTC.wethUsdcPool()).toString()} silo: ${(await StrategySiloUsdcCbBTC.silo()).toString()}`);
    console.log(`StrategySiloUsdcWstETH wethUsdcPool after: ${(await StrategySiloUsdcWstETH.wethUsdcPool()).toString()} silo: ${(await StrategySiloUsdcWstETH.silo()).toString()}`);
    console.log(`StrategySiloUsdcCbETH wethUsdcPool after: ${(await StrategySiloUsdcCbETH.wethUsdcPool()).toString()} silo: ${(await StrategySiloUsdcCbETH.silo()).toString()}`);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

