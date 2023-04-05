// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
