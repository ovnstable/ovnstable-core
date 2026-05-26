const { getContract, transferETH, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { fromE6 } = require("@overnight-contracts/common/utils/decimals");
const { ethers } = require("hardhat");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

const RM_BASE = "0xA5096260710D135F9C3762FcD07B6b2E2Fd127D1";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

const STRATS = [
    { name: "EtsChi",     addr: "0x5a63103E6A569A3bDf5684C2c4098b0e2e45eB44" },
    { name: "EtsChiNew",  addr: "0xA5B5F9cEd2A15211e70C965C37eeDF5457744aca" },
    { name: "EtsPhi",     addr: "0xBDC31ccA4765c7925F789e4AD57E5018d4b95FFB" },
    { name: "EtsRho",     addr: "0x78fA92E54C36586BCb0CB3a2dC37DF157Fd64708" },
    { name: "EtsTau",     addr: "0x389Dba309C7F6B0448Ca00012dB7a77cE30B48a1" },
    { name: "EtsUpsilon", addr: "0xdE13b1f343Ad5EBC0C1F8a8694289feEf9c593C3" },
];

async function main() {
    const timelock = await getContract('AgentTimelock');
    await transferETH(15, timelock.address);

    const abi = require("@overnight-contracts/strategies-base/deployments/base/StrategyEtsTau.json").abi;

    const buffersBP = [500, 1000, 1500, 2000, 3000, 5000];

    await execTimelock(async (signer) => {
        for (const s of STRATS) {
            console.log(`\n=== ${s.name} ${s.addr} ===`);
            const c = new ethers.Contract(s.addr, abi, signer);
            const usdc = await ethers.getContractAt(IERC20, USDC);

            await (await c.setStrategyParams(signer.address, RM_BASE)).wait();

            const nav = await c.netAssetValue();
            console.log(`NAV: ${fromE6(nav)}`);

            // try unstakeFull (targetIsZero=true)
            {
                let snapId = await hre.network.provider.request({ method: "evm_snapshot", params: [] });
                try {
                    const balBefore = await usdc.balanceOf(wal);
                    const tx = await c.unstake(USDC, 0, wal, true, { gasLimit: 8_000_000 });
                    const rcpt = await tx.wait();
                    const balAfter = await usdc.balanceOf(wal);
                    const navAfter = await c.netAssetValue();
                    console.log(`FULL OK gas=${rcpt.gasUsed} got=${fromE6(balAfter.sub(balBefore))} navAfter=${fromE6(navAfter)}`);
                } catch (e) {
                    console.log(`FULL FAIL: ${(e.error?.message || e.message).slice(0,160)}`);
                }
                await hre.network.provider.request({ method: "evm_revert", params: [snapId] });
            }

            for (const bp of buffersBP) {
                const amount = nav.sub(nav.mul(bp).div(10000));
                let snapId = await hre.network.provider.request({ method: "evm_snapshot", params: [] });
                try {
                    const tx = await c.unstake(USDC, amount, wal, false, { gasLimit: 8_000_000 });
                    const rcpt = await tx.wait();
                    console.log(`buf=${bp}bp amount=${fromE6(amount)} OK gas=${rcpt.gasUsed}`);
                } catch (e) {
                    console.log(`buf=${bp}bp amount=${fromE6(amount)} FAIL: ${(e.error?.message || e.message).slice(0,120)}`);
                }
                await hre.network.provider.request({ method: "evm_revert", params: [snapId] });
            }
        }
    });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
