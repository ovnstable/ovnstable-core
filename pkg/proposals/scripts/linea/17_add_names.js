const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'linea');
    let pm_usdt = await getContract('PortfolioManager', 'linea_usdt');

    const StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
    const newMendiUsdcImpl = "";

    const StrategyEtsAlpha = await getContract("StrategyEtsAlpha", "linea");
    const newEtsAlphaImpl = "0xCd892521038cb29d7Cc86D9149a3e1433aa3BfD1";

    const StrategyMendiUsdt = await getContract("StrategyMendiUsdt", "linea_usdt");
    const newMendiUsdtImpl = "";

    const StrategyEtsBetaUsdt = await getContract("StrategyEtsBetaUsdt", "linea_usdt");
    const newEtsBetaUsdtImpl = "";

    addProposalItem(StrategyMendiUsdc, "upgradeTo", [newMendiUsdcImpl]);
    addProposalItem(StrategyEtsAlpha, "upgradeTo", [newEtsAlphaImpl]);

    addProposalItem(StrategyMendiUsdt, "upgradeTo", [newMendiUsdtImpl]);
    addProposalItem(StrategyEtsBetaUsdt, "upgradeTo", [newEtsBetaUsdtImpl]);

    addProposalItem(StrategyMendiUsdc, 'setStrategyName', ["Mendi USDC"]);
    addProposalItem(StrategyEtsAlpha, 'setStrategyName', ["AlphaLinea"]);

    addProposalItem(StrategyMendiUsdt, 'setStrategyName', ["Mendi USDT"]);
    addProposalItem(newMendiUsdtImpl, 'setStrategyName', ["BetaLinea"]);

    addProposalItem(pm, 'upgradeTo', ['0x1c592E055Ec06A68f89499fe0aCDd262b30Da361']);
    addProposalItem(pm_usdt, 'upgradeTo', ['']);


    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'linea');
    await testUsdPlus(filename, 'linea_usdc');

    // await createProposal(filename, addresses, values, abis);

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
