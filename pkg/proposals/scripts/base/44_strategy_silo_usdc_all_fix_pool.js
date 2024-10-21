const hre = require("hardhat");
const { getContract, transferETH, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { BASE } = require('@overnight-contracts/common/utils/assets');

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

    addProposalItem(StrategySiloUsdcUsdPlus, "setParams", [{
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0xb82a644a112AD609B89C684Ce2B73757f00D9C3D', // wUSD+, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool
    }]);

    addProposalItem(StrategySiloUsdcCbBTC, "setParams", [{
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0xDa79416990e7FA79E310Ab938B01ED75CBB64a90', // cbBTC, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool
    }]);

    addProposalItem(StrategySiloUsdcWstETH, "setParams", [{
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0xEB42de7d17dfAFfD03AF48c2A51c3FB7274d3396', // wstETH, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool
    }]);

    addProposalItem(StrategySiloUsdcCbETH, "setParams", [{
        usdc: BASE.usdc,
        weth: BASE.weth,
        silo: '0x839Aa8B0641b77db2C9eFFEC724DD2dF46290FA2', // cbETH, WETH, USDC market
        siloIncentivesController: BASE.siloIncentivesController,
        siloLens: BASE.siloLens,
        siloToken: BASE.siloToken,        
        aerodromeRouter: BASE.aerodromeRouter,
        siloWethPool: "0x57bd5C33c8002A634b389Ab4de5e09eC1C31Dce7",
        wethUsdcPool
    }]);

    //await testProposal(addresses, values, abis);


    await createProposal(filename, addresses, values, abis);

    console.log(`StrategySiloUsdcUsdPlus wethUsdcPool after: ${(await StrategySiloUsdcUsdPlus.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcCbBTC wethUsdcPool after: ${(await StrategySiloUsdcCbBTC.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcWstETH wethUsdcPool after: ${(await StrategySiloUsdcWstETH.wethUsdcPool()).toString()}`);
    console.log(`StrategySiloUsdcCbETH wethUsdcPool after: ${(await StrategySiloUsdcCbETH.wethUsdcPool()).toString()}`);

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

