const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let thrusterSwap = await getContract('StrategyThrusterSwap', 'localhost'); 
    let gas = {
        gasLimit: 20000000,
        // maxFeePerGas: "38000000",
        // maxPriorityFeePerGas: "1300000",
    }


    const unitAddress = "0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055";
    const provider = new ethers.providers.JsonRpcProvider(
        "http://localhost:8545"
    );
    await provider.send("hardhat_impersonateAccount", [unitAddress]);
    const unitAccount = await provider.getSigner(unitAddress); 
    // await transferETH(10, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let usdb = await getERC20ByAddress(BLAST.usdb);
    let amountFrom = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountFrom =", amountFrom.toString());

    await thrusterSwap.connect(unitAccount).claimMerkl(
        ["0x147812C2282eC48512a6f6f11F7c98d78D1ad74B"], // users
        ["0xE36072DD051Ce26261BF50CD966311cab62C596e"], // tokens
        ["24708305254725000000000"],                   // amounts
        [                                               // proofs
            [
                "0xc2877674ed83cba366063fdb02a5b8e4329cf11c00b94d47792e375287cf7aec",
                "0xf1b3cd2871f8873c57cb09513c9020974067526b22770ec63cb0adbead377bce",
                "0xb0594facc938ddcc0c5b56ef8d87b2ea0254fbca098436662a0e92c9fd1d296b",
                "0xc76bb4b05a152f766addf54fa1f076ee5a50cf65b100759c32d657278f79a10d",
                "0x860bc6aa72ebfafa3d5ce1c2e113595d0e705db734baa1b82477dbf195ccae9c",
                "0x46aa44ec2b24082c93e9a2c828fd982df48b9efc2619ae75f8a9c671b545287c",
                "0xcdb83d89c11ba55d29a71be42114c1cec427922622a22b06725761dc3d58df98",
                "0x4dd3bb69f44175d449d934a405feb0e4c613874ebf721a895163c76c56b6d3a8",
                "0x06763a75e9c06db4523398a30ccd3e84889e9f0a562083ef82e3b948af1820a7",
                "0xf2312ad0a00c003737fa2f97e582b56e5e6034a33cc569ca2e88773a558529db",
                "0xaf3de7c167a8851c9fa68eacab7c112ab3fc906e8a0b817e855bc00738c8dd0e",
                "0x163172b3f9f1ba44e8f807ca77ae450987a6257561a6ec6071fad02f17077691",
                "0x3b30e9f022ee3ed6e1a671db2ee18b154883cce1e391c842d60b536a8a4fb383",
                "0x137d76a1b6f27d14ed2ce7b774472a25922378b2904c0e5dfb92330973008a02",
                "0x015f870da955bc4bb89203c56bf0093b1cf846a969cbb865a0a7e7f67b2ed518",
                "0xf6b3d78235b5f58d37a7992769ea893dfa17a1db8f75f08efaf8a3fad9a5ecb5",
                "0x5c66b925b9a03dabdf8e62f0c9429f372fbc42430665574adc384b47025cd2e2"
            ]
        ]
    , gas);


    let amountTo = await usdb.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountTo =", amountTo.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });