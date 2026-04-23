const { getContract, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { fromE18, fromE6 } = require("@overnight-contracts/common/utils/decimals");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

const TMP_ETH_ABI_EXTRA = [
    "function swapNuke(bool doSwap) external",
];
const TMP_DAI_ABI_EXTRA = [
    "function swapV2A(uint256 amountIn) external",
    "function swapV2B(uint256 amountIn) external",
    "function swapArbDexA(uint256 amountIn) external",
    "function swapArbDexB(uint256 amountIn) external",
    "function swapSkimmable(uint256 amountIn) external",
    "function swapUniV3(uint256 maxAmountIn) external",
    "function nuke() external",
];

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const STRATEGY_AAVE_DAI = "0x0A41ffF992f04e1610C8e5B32bb72B2878270381";
const STRATEGY_SILO_ETH = "0x6787A015c8224e864F456Fe18aca57f0AE1BabB6";

const PM_ARB_DAI = "0xB551BE6de9c9fae3B83310BA4e1768327Dc0e2FC";
const PM_ARB_ETH = "0x769B4EFA1560AF66D4FE338A5041cB5710352583";
const RM_ARB     = "0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA";

// =========================================================================
// HOW TO RUN
//
// 1) Deploy Tmp impls:
//      localhost test:
//        cd pkg/core
//        STAND=arbitrum_dai hh deploy --tags UsdPlusTokenArbDaiTmp --impl --network localhost
//        STAND=arbitrum_eth hh deploy --tags UsdPlusTokenArbEthTmp --impl --network localhost
//      prod (real Arbitrum):
//        cd pkg/core
//        STAND=arbitrum_dai hh deploy --tags UsdPlusTokenArbDaiTmp --impl --network arbitrum_dai
//        STAND=arbitrum_eth hh deploy --tags UsdPlusTokenArbEthTmp --impl --network arbitrum_eth
//
// 2) Paste deployed impl addresses into TMP_IMPL_DAI / TMP_IMPL_ETH (or pass via env vars).
//
// 3) Run proposal on localhost:
//        cd pkg/proposals
//        hh run scripts/arbitrum/61_withdraw_usdplus.js --network localhost
//    prod: swap testProposal -> createProposal at the bottom.
//
// NOTE: USDT+ shutdown is intentionally excluded from this proposal and
// moved to scripts/arbitrum/62_withdraw_usdt.js (separate later rollout).
// =========================================================================

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

    const TMP_IMPL_DAI = process.env.TMP_IMPL_DAI || "";
    const TMP_IMPL_ETH = process.env.TMP_IMPL_ETH || "";

    if (!ethers.utils.isAddress(TMP_IMPL_DAI)) throw new Error("TMP_IMPL_DAI not set");
    if (!ethers.utils.isAddress(TMP_IMPL_ETH)) throw new Error("TMP_IMPL_ETH not set");

    const timelock = await getContract('AgentTimelock');
    const timelockAddr = timelock.address;

    if (hre.network.name === 'localhost') {
        await transferETH(15, timelockAddr);
        await transferETH(15, wal);
    }

    const v1Artifact = require("@overnight-contracts/core/artifacts/contracts/UsdPlusTokenV1.sol/UsdPlusTokenV1.json");

    const daiPlusProxyContract = await getContract('UsdPlusToken', 'arbitrum_dai');
    const ethPlusProxyContract = await getContract('UsdPlusToken', 'arbitrum_eth');

    const daiPlusProxy = await ethers.getContractAt(v1Artifact.abi, daiPlusProxyContract.address);
    const ethPlusProxy = await ethers.getContractAt(v1Artifact.abi, ethPlusProxyContract.address);

    async function readImpl(addr) {
        const raw = await ethers.provider.getStorageAt(addr, IMPL_SLOT);
        return ethers.utils.getAddress("0x" + raw.slice(-40));
    }

    const DAI_PLUS_OLD_IMPL = await readImpl(daiPlusProxy.address);
    const ETH_PLUS_OLD_IMPL = await readImpl(ethPlusProxy.address);

    const dai = await ethers.getContractAt(IERC20, ARBITRUM.dai);
    const weth = await ethers.getContractAt(IERC20, ARBITRUM.weth);
    const usdPlusArb = await ethers.getContractAt(IERC20, ARBITRUM.usdPlus);

    const aaveDaiAbi = require("@overnight-contracts/strategies-arbitrum/deployments/arbitrum_dai/StrategyAaveDai.json").abi;
    const siloEthAbi = require("@overnight-contracts/strategies-arbitrum/deployments/arbitrum_eth/StrategySiloEth.json").abi;
    const aaveDai = new ethers.Contract(STRATEGY_AAVE_DAI, aaveDaiAbi, ethers.provider);
    const siloEth = new ethers.Contract(STRATEGY_SILO_ETH, siloEthAbi, ethers.provider);

    const daiPlusFull = new ethers.Contract(
        daiPlusProxy.address,
        [...v1Artifact.abi, ...TMP_DAI_ABI_EXTRA],
        ethers.provider
    );
    const ethPlusFull = new ethers.Contract(
        ethPlusProxy.address,
        [...v1Artifact.abi, ...TMP_ETH_ABI_EXTRA],
        ethers.provider
    );

    const daiPools = [
        { name: 'V2 A        ', addr: '0xB260163158311596Ea88a700C5a30f101D072326' },
        { name: 'V2 B        ', addr: '0x60A3bBeC81a92e8894eD112A148dFCC98F577bA1' },
        { name: 'ArbDex A    ', addr: '0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e' },
        { name: 'Skimmable   ', addr: '0x51E073D92b0c226F7B0065909440b18A85769606' },
        { name: 'ArbDex B    ', addr: '0xeE5e74Dc56594d070E0827ec270F974A68EBAF22' },
        { name: 'UniV3       ', addr: '0x6C9AF2ddf5d21e5dE1D6E97e25a57ac4e6CfBA38' },
    ];
    const ethPools = [
        { name: 'UniV3       ', addr: '0x869d49d115edbf6f5957A6E4bf609fc64fF8b84c' },
    ];

    async function logImpl(label, proxy, fmt) {
        const ts = await proxy.totalSupply();
        let pausedStr = "n/a";
        try { pausedStr = String(await proxy.paused()); } catch {}
        const impl = await readImpl(proxy.address);
        console.log(`[${label}] totalSupply: ${fmt(ts)} | paused: ${pausedStr} | impl: ${impl}`);
    }

    async function logWal() {
        const dp = await daiPlusProxy.balanceOf(wal);
        const ep = await ethPlusProxy.balanceOf(wal);
        const usdB = await usdPlusArb.balanceOf(wal);
        const daiB = await dai.balanceOf(wal);
        const wethB = await weth.balanceOf(wal);
        console.log(`[WAL] DAI+: ${fromE18(dp)} | ETH+: ${fromE18(ep)} | USD+: ${fromE6(usdB)} | DAI: ${fromE18(daiB)} | WETH: ${fromE18(wethB)}`);
    }

    async function logPools(label, pools, tokenProxy, tokenFmt) {
        console.log(`[${label} POOLS]`);
        for (const p of pools) {
            const self = await tokenProxy.balanceOf(p.addr);
            console.log(`  ${p.name} ${p.addr} | self-in-pool: ${tokenFmt(self)}`);
        }
    }

    async function logStrategies() {
        const aDai = await aaveDai.netAssetValue();
        const sEth = await siloEth.netAssetValue();
        console.log(`[STRATEGIES] AaveDai NAV: ${fromE18(aDai)} | SiloEth NAV: ${fromE18(sEth)}`);
    }

    console.log("\n===== BEFORE EXECUTION =====\n");
    await logImpl('DAI+', daiPlusProxy, fromE18);
    await logImpl('ETH+', ethPlusProxy, fromE18);
    console.log("");
    await logWal();
    await logStrategies();
    await logPools('DAI+', daiPools, daiPlusProxy, fromE18);
    await logPools('ETH+', ethPools, ethPlusProxy, fromE18);
    console.log("\n" + "=".repeat(60) + "\n");

    console.log(`Tmp impl DAI+: ${TMP_IMPL_DAI}`);
    console.log(`Tmp impl ETH+: ${TMP_IMPL_ETH}`);
    console.log(`Old impl DAI+: ${DAI_PLUS_OLD_IMPL}`);
    console.log(`Old impl ETH+: ${ETH_PLUS_OLD_IMPL}`);
    console.log("");

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

    const AMOUNT_18 = ethers.BigNumber.from("1000000000").mul(ethers.BigNumber.from(10).pow(18));

    // --- DAI+ ---
    addProposalItem(daiPlusFull, 'upgradeTo',     [TMP_IMPL_DAI]);
    addProposalItem(daiPlusFull, 'swapV2A',       [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'swapV2B',       [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'swapArbDexA',   [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'swapSkimmable', [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'swapArbDexB',   [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'swapUniV3',     [AMOUNT_18]);
    addProposalItem(daiPlusFull, 'nuke',          []);
    addProposalItem(daiPlusFull, 'upgradeTo',     [DAI_PLUS_OLD_IMPL]);

    // --- ETH+ ---
    addProposalItem(ethPlusFull, 'upgradeTo', [TMP_IMPL_ETH]);
    addProposalItem(ethPlusFull, 'swapNuke',  [true]);
    addProposalItem(ethPlusFull, 'upgradeTo', [ETH_PLUS_OLD_IMPL]);

    // --- StrategyAaveDai (arb_dai) ---
    const navAaveDai = await aaveDai.netAssetValue();
    console.log(`[STRATEGY AaveDai] NAV: ${fromE18(navAaveDai)}`);
    addProposalItem(aaveDai, 'setPortfolioManager', [timelockAddr]);
    addProposalItem(aaveDai, 'claimRewards',        [wal]);
    addProposalItem(aaveDai, 'unstake',             [ARBITRUM.dai, navAaveDai, wal, false]);
    addProposalItem(aaveDai, 'setPortfolioManager', [PM_ARB_DAI]);

    // --- StrategySiloEth (arb_eth) ---
    const navSiloEth = await siloEth.netAssetValue();
    console.log(`[STRATEGY SiloEth] NAV: ${fromE18(navSiloEth)}`);
    addProposalItem(siloEth, 'setStrategyParams', [timelockAddr, RM_ARB]);
    addProposalItem(siloEth, 'claimRewards',      [wal]);
    addProposalItem(siloEth, 'unstake',           [ARBITRUM.weth, navSiloEth, wal, false]);
    addProposalItem(siloEth, 'setStrategyParams', [PM_ARB_ETH, RM_ARB]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    await logImpl('DAI+', daiPlusProxy, fromE18);
    await logImpl('ETH+', ethPlusProxy, fromE18);
    console.log("");
    await logWal();
    await logStrategies();
    await logPools('DAI+', daiPools, daiPlusProxy, fromE18);
    await logPools('ETH+', ethPools, ethPlusProxy, fromE18);
    console.log("\n" + "=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
