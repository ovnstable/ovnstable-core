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

    const newImplementation = "0x896DE3552C9d32Cf5EC8b8BD66E08DC9Fb50A93B";

    let addresses = [];
    let values = [];
    let abis = [];
    
    addProposalItem(StrategySiloUsdcUsdPlus, "upgradeTo", [newImplementation]);
    addProposalItem(StrategySiloUsdcCbBTC, "upgradeTo", [newImplementation]);
    addProposalItem(StrategySiloUsdcWstETH, "upgradeTo", [newImplementation]);
    addProposalItem(StrategySiloUsdcCbETH, "upgradeTo", [newImplementation]);

    addProposalItem(StrategySiloUsdcUsdPlus, "setParams", [ await strategySiloUsdcUsdPlusParams() ]);
    addProposalItem(StrategySiloUsdcCbBTC, "setParams", [ await strategySiloUsdcCbBTCParams()]);
    addProposalItem(StrategySiloUsdcWstETH, "setParams", [ await strategySiloUsdcWstETHParams()]);
    addProposalItem(StrategySiloUsdcCbETH, "setParams", [ await strategySiloUsdcCbETHParams()] );

    //await testProposal(addresses, values, abis);
    
    await createProposal(filename, addresses, values, abis);

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

