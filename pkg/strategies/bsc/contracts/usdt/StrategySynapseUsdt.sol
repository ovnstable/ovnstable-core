// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "../libraries/OvnMath.sol";
import "../libraries/PancakeSwapLibrary.sol";
import "../connectors/synapse/interfaces/ISwap.sol";
import "../connectors/synapse/interfaces/IMiniChefV2.sol";


contract StrategySynapseUsdt is Strategy {
    using OvnMath for uint256;

    IERC20 public usdtToken;
    IERC20 public nUsdLPToken;
    IERC20 public synToken;

    ISwap public swap;
    IMiniChefV2 public miniChefV2;
    IPancakeRouter02 public pancakeRouter;
    uint256 public pid;


    // --- events

    event StrategyUpdatedTokens(address usdtToken, address nUsdLPToken, address synToken);

    event StrategyUpdatedParams(address swap, address miniChefV2, address pancakeRouter, uint256 pid);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdtToken,
        address _nUsdLPToken,
        address _synToken
    ) external onlyAdmin {

        require(_usdtToken != address(0), "Zero address not allowed");
        require(_nUsdLPToken != address(0), "Zero address not allowed");
        require(_synToken != address(0), "Zero address not allowed");

        usdtToken = IERC20(_usdtToken);
        nUsdLPToken = IERC20(_nUsdLPToken);
        synToken = IERC20(_synToken);

        emit StrategyUpdatedTokens(_usdtToken, _nUsdLPToken, _synToken);
    }

    function setParams(
        address _swap,
        address _miniChefV2,
        address _pancakeRouter,
        uint64 _pid
    ) external onlyAdmin {

        require(_swap != address(0), "Zero address not allowed");
        require(_miniChefV2 != address(0), "Zero address not allowed");
        require(_pancakeRouter != address(0), "Zero address not allowed");
        require(_pid != 0, "Zero value not allowed");

        swap = ISwap(_swap);
        miniChefV2 = IMiniChefV2(_miniChefV2);
        pancakeRouter = IPancakeRouter02(_pancakeRouter);
        pid = _pid;

        emit StrategyUpdatedParams(_swap, _miniChefV2, _pancakeRouter, _pid);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdtToken), "Some token not compatible");

        // add liquidity
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = 0;
        amounts[3] = usdtBalance.subBasisPoints(4);
        uint256 minToMint = swap.calculateTokenAmount(amounts, true);
        amounts[3] = usdtBalance;
        usdtToken.approve(address(swap), usdtBalance);
        uint256 nUsdLPTokenAmount = swap.addLiquidity(amounts, minToMint, block.timestamp);

        // stake
        nUsdLPToken.approve(address(miniChefV2), nUsdLPTokenAmount);
        miniChefV2.deposit(pid, nUsdLPTokenAmount, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdtToken), "Some token not compatible");

        // unstake
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = 0;
        amounts[3] = _amount.addBasisPoints(4) + 1;
        uint256 lpBalance = swap.calculateTokenAmount(amounts, false);
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (lpBalance > amount) {
            lpBalance = amount;
        }
        miniChefV2.withdraw(pid, lpBalance, address(this));

        // remove liquidity
        nUsdLPToken.approve(address(swap), lpBalance);
        swap.removeLiquidityOneToken(lpBalance, 3, _amount, block.timestamp);

        return usdtToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdtToken), "Some token not compatible");

        // unstake
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return usdtToken.balanceOf(address(this));
        }
        miniChefV2.withdraw(pid, amount, address(this));

        // remove liquidity
        uint256 usdtBalance = swap.calculateRemoveLiquidityOneToken(amount, 3);
        nUsdLPToken.approve(address(swap), amount);
        swap.removeLiquidityOneToken(amount, 3, usdtBalance, block.timestamp);

        return usdtToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount > 0) {
            if (nav) {
                usdtBalance += swap.calculateRemoveLiquidityOneToken(1e18, 3) * amount / 1e18;
            } else {
                usdtBalance += swap.calculateRemoveLiquidityOneToken(amount, 3);
            }
        }

        return usdtBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return 0;
        }
        miniChefV2.harvest(pid, address(this));

        // sell rewards
        uint256 totalUsdt;

        uint256 synBalance = synToken.balanceOf(address(this));
        if (synBalance > 0) {
            uint256 amountOutMin = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(synToken),
                address(usdtToken),
                synBalance
            );

            if (amountOutMin > 0) {
                uint256 synUsdt = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(synToken),
                    address(usdtToken),
                    synBalance,
                    amountOutMin,
                    address(this)
                );
                totalUsdt += synUsdt;
            }
        }

        if (totalUsdt > 0) {
            usdtToken.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
