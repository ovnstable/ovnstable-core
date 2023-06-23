// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ICamelotRouter {

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountOut);

    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountIn);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);

    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external view returns (uint[] memory amounts);


    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        address referrer,
        uint deadline
    ) external;


}

interface PositionHelper {

  function addLiquidityAndCreatePosition(
    address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired,
    uint256 amountAMin, uint256 amountBMin, uint256 deadline, address to, INFTPool nftPool, uint256 lockDuration
  ) external ;


  function addLiquidityETHAndCreatePosition(
    address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, uint256 deadline,
    address to, INFTPool nftPool, uint256 lockDuration
  ) external payable ;
}

interface INFTPool is IERC721 {
  function exists(uint256 tokenId) external view returns (bool);
  function hasDeposits() external view returns (bool);
  function lastTokenId() external view returns (uint256);
  function getPoolInfo() external view returns (
    address lpToken, address grailToken, address sbtToken, uint256 lastRewardTime, uint256 accRewardsPerShare,
    uint256 lpSupply, uint256 lpSupplyWithMultiplier, uint256 allocPoint
  );
  function getStakingPosition(uint256 tokenId) external view returns (
    uint256 amount, uint256 amountWithMultiplier, uint256 startLockTime,
    uint256 lockDuration, uint256 lockMultiplier, uint256 rewardDebt,
    uint256 boostPoints, uint256 totalMultiplier
  );
  function createPosition(uint256 amount, uint256 lockDuration) external;
  function boost(uint256 userAddress, uint256 amount) external;
  function unboost(uint256 userAddress, uint256 amount) external;
}

interface ICamelotPair {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint16 token0feePercent, uint16 token1FeePercent);
    function getAmountOut(uint amountIn, address tokenIn) external view returns (uint);
    function kLast() external view returns (uint);

    function setFeePercent(uint16 token0FeePercent, uint16 token1FeePercent) external;
    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data, address referrer) external;
    function skim(address to) external;
    function sync() external;

    function initialize(address, address) external;
}


library CamelotLibrary {

    function getAmountsOut(
        ICamelotRouter router,
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        return router.getAmountsOut(amountInput, path)[1];
    }

    function getAmountsOut(
        ICamelotRouter router,
        address[] memory path,
        uint256 amountInput
    ) internal view returns (uint256) {
        return router.getAmountsOut(amountInput, path)[1];
    }


    function getAmountsOut(
        ICamelotRouter router,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        return router.getAmountsOut(amountInput, path)[2];
    }

    function singleSwap(
        ICamelotRouter router,
        address inputToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal  {

        IERC20(inputToken).approve(address(router), amountInput);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            address(0),
            block.timestamp
        );
    }

    function multiSwap(
        ICamelotRouter router,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal  {

        IERC20(inputToken).approve(address(router), amountInput);

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            address(0),
            block.timestamp
        );
    }

    function pathSwap(
        ICamelotRouter router,
        address[] memory path,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal  {

        IERC20(path[0]).approve(address(router), amountInput);

        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            address(0),
            block.timestamp
        );
    }
}
