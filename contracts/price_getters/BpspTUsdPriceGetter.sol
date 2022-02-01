// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";

contract BpspTUsdPriceGetter is AbstractPriceGetter {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public bpspTUsdToken;
    IERC20 public balancerPool;
    bytes32 public balancerPoolId;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _bpspTUsdToken,
        address _balancerPool,
        bytes32 _balancerPoolId
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");
        require(_balancerPool != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);
        balancerPool = IERC20(_balancerPool);
        balancerPoolId = _balancerPoolId;
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        return _getUsdcPrice();
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        return _getUsdcPrice();
    }

    function _getUsdcPrice() internal view returns (uint256) {
        uint256 balanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] == usdcToken) {
                balanceUsdc = balances[i] * (10 ** 12);
            }
        }
        uint256 totalSupply = balancerPool.totalSupply();

        //TODO: Balancer. Hardcode for swap fee
        return (10 ** 18) * balanceUsdc * 4 / totalSupply * 994 / 1000;
    }
}
