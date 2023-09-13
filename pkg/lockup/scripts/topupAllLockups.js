const { toE18 } = require("@overnight-contracts/common/utils/decimals");
const { ethers } = require('hardhat');

async function main() {

    let addresses = {
        '0x1D84b3BE59EfE99D89bAc8D40B3E4a63c101aB0d': toE18(100),
        '0x8A35a905321BD4FB54DCD330D1d26208879E3765': toE18(200),
        '0xdee0d6708e1ba93F5a19dE6837dA1fEDdd28DE95': toE18(300),
        '0x05d03970f72FDAf41c37bC233DdD3B4cF9614bE7': toE18(400),
        '0x032928CC782F447cf646A2E0873F95Cb820e1aF8': toE18(500)
    }
    
    const ovnAddress = '0x448e87779345cc2a4b3772DfD0f63200837B2615';
    const tokenAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const token = new ethers.Contract(ovnAddress, tokenAbi);

    for (const [lockupAddress, amount] of Object.entries(addresses)) {
        try {
            const tx = await token.transfer(lockupAddress, amount);
            await tx.wait();
            console.log(`Tokens sent to contract at address ${lockupAddress}`);
        } catch (error) {
            console.error(`Error sending tokens to contract at address ${lockupAddress}: ${error.message}`);
        }
    }

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

