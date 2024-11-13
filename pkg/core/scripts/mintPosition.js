const { getContract, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { ethers } = require('hardhat');

async function mintPosition(amount0Desired, amount1Desired) {
    // Position Manager contract
    const positionManager = await ethers.getContractAt(
        [
            'function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
        ],
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    );

    const params = {
        token0: '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65',
        token1: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        fee: 100,
        tickLower: -18,
        tickUpper: 2,
        amount0Desired: amount0Desired,
        amount1Desired: amount1Desired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: '0x086dFe298907DFf27BD593BD85208D57e0155c94',
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    // Mint position
    const tx = await positionManager.mint(params);
    const receipt = await tx.wait();

    console.log('Position minted:', receipt.transactionHash);
    return receipt;
}

async function main() {
    // Example usage with adjustable amounts
    const amount0 = ethers.utils.parseUnits('2000000', 6); // Adjust decimals as needed
    const amount1 = ethers.utils.parseUnits('2000000', 6); // Adjust decimals as needed

    await mintPosition(amount0, amount1);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
