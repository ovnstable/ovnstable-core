const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const path = require('path');

const {BASE, COMMON, BLAST} = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    
    let fenixSwap = await getContract('StrategyFenixSwap', 'blast'); 
    let gas = {
        gasLimit: 20000000,
        // maxFeePerGas: "38000000",
        // maxPriorityFeePerGas: "1300000",
    }

    // await transferETH(10, "0x086dFe298907DFf27BD593BD85208D57e0155c94");

    let fnx = await getERC20ByAddress(BLAST.fnx);
    let amountFrom = await fnx.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountFrom =", amountFrom);

    await fenixSwap.claimMerkleTreeRewardsToWallet(
        COMMON.rewardWallet,
        BLAST.distributor,
        ["0xa09A8e94FBaAC9261af8f34d810D96b923B559D2"], // users
        ["0x52f847356b38720B55ee18Cb3e094ca11C85A192"], // tokens
        ["280804464198000000000000"],                   // amounts
        [                                               // proofs
            [
                "0xa12ccb02a2b8a50f18f8cc8419426f6c054ece2ee3eda8f6329269a99f646b0d",
                "0x6789a42462045997848c11af6721b3404d5ca993d58ae055cc24e247dfb51081",
                "0xcf0e54850143427a987630fd654284255f01c452e3ac02005215abd80b3661e2",
                "0xafaee6adbcbdb06d8fa2daa1c03de5653e79c2b1181bcf7188a2abc0fbf518c8",
                "0x316050d3132b703f096a0ada9ef870ee321996b1a64c5ffff7cc2a2b1d878728",
                "0x809f164af5559c60cf392091ba14ba9d93a3f332d0055aaa486db7059e0a8cad",
                "0x7a07a109a984d90b5fbf07c6571204466b2accc5dedb88192e26e03b71c19418",
                "0x27efff7e87b5673adc71a3d56756086ef7d0d3bcff44f96a70049468d4f78245",
                "0xb701b1d41904d8df03841a1bb17966445101a95d5f7a23c400b10f50e6001130",
                "0x7916e612c3b3654f9fcebf7094768b46b11659da947c1ab250c3f772e2591900",
                "0x5e01df21b03c381b0061fab575bd2611910becd8a3c47533b28f5633e4315f57",
                "0x7bade17db93fb9b6e532155a2ebbfb06a32af8022ec8462ccf0b2708be108698",
                "0x072562d3cd9a31949ef92b4db863cbc0cfad7e1d74fece45e1095193ce028211",
                "0x83f564509fd33dfba625feab5c5ce1f7664df58692ae0da39a0fb5b0fc196496",
                "0x597e5182317417b63ddba5b6ad074581371a92e3f7b7c3d7a15da7ea14026e82",
                "0xcbeec62536fdeca4967632c07413a197e96eae384742f60f019ccd3b197ed525",
                "0xb1a61dfe51f081df748233249498b2efa215efe527a46f9c3341ce1c96bb1b3e"
            ]
        ]
    , gas);

    let amountTo = await fnx.balanceOf(COMMON.rewardWallet);
    console.log("DEBUG: amountTo =", amountTo);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });