// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./libraries/OvnMath.sol";
import "./libraries/UniswapV3Library.sol";
import "./connectors/synapse/interfaces/ISwap.sol";
import "./connectors/synapse/interfaces/IMiniChefV2.sol";


contract StrategySynapseUsdc is Strategy {
    using OvnMath for uint256;

    IERC20 public usdcToken;
    IERC20 public nUsdLPToken;
    IERC20 public synToken;
    IERC20 public wethToken;

    ISwap public swap;
    IMiniChefV2 public miniChefV2;
    uint256 public pid;

    address public uniswapV3Router;
    uint24 public poolFee0;
    uint24 public poolFee1;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address nUsdLPToken, address synToken, address wethToken);

    event StrategyUpdatedParams(address swap, address miniChefV2, uint256 pid, address uniswapV3Router, uint24 poolFee0, uint24 poolFee1);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _nUsdLPToken,
        address _synToken,
        address _wethToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_nUsdLPToken != address(0), "Zero address not allowed");
        require(_synToken != address(0), "Zero address not allowed");
        require(_wethToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        nUsdLPToken = IERC20(_nUsdLPToken);
        synToken = IERC20(_synToken);
        wethToken = IERC20(_wethToken);

        emit StrategyUpdatedTokens(_usdcToken, _nUsdLPToken, _synToken, _wethToken);
    }

    function setParams(
        address _swap,
        address _miniChefV2,
        uint64 _pid,
        address _uniswapV3Router,
        uint24 _poolFee0,
        uint24 _poolFee1
    ) external onlyAdmin {

        require(_swap != address(0), "Zero address not allowed");
        require(_miniChefV2 != address(0), "Zero address not allowed");
        require(_pid != 0, "Zero value not allowed");
        require(_uniswapV3Router != address(0), "Zero address not allowed");
        require(_poolFee0 != 0, "Zero value not allowed");
        require(_poolFee1 != 0, "Zero value not allowed");

        swap = ISwap(_swap);
        miniChefV2 = IMiniChefV2(_miniChefV2);
        pid = _pid;
        uniswapV3Router = _uniswapV3Router;
        poolFee0 = _poolFee0;
        poolFee1 = _poolFee1;

        emit StrategyUpdatedParams(_swap, _miniChefV2, _pid, _uniswapV3Router, _poolFee0, _poolFee1);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        // add liquidity
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0;
        amounts[1] = _amount.subBasisPoints(4, 1e4);
        uint256 minToMint = swap.calculateTokenAmount(amounts, true);
        amounts[1] = _amount;
        usdcToken.approve(address(swap), _amount);
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

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0;
        amounts[1] = _amount.addBasisPoints(4, 1e4) + 1;
        uint256 balanceLP = swap.calculateTokenAmount(amounts, false);
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (balanceLP > amount) {
            balanceLP = amount;
        }
        miniChefV2.withdraw(pid, balanceLP, address(this));

        // remove liquidity
        nUsdLPToken.approve(address(swap), balanceLP);
        swap.removeLiquidityOneToken(balanceLP, 1, _amount, block.timestamp);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // unstake
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return usdcToken.balanceOf(address(this));
        }
        miniChefV2.withdraw(pid, amount, address(this));

        // remove liquidity
        uint256 usdcBalance = swap.calculateRemoveLiquidityOneToken(amount, 1);
        nUsdLPToken.approve(address(swap), amount);
        swap.removeLiquidityOneToken(amount, 1, usdcBalance, block.timestamp);

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount > 0) {
            if (nav) {
                usdcBalance += swap.calculateRemoveLiquidityOneToken(1e18, 1) * amount / 1e18;
            } else {
                usdcBalance += swap.calculateRemoveLiquidityOneToken(amount, 1);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 amount,) = miniChefV2.userInfo(pid, address(this));
        if (amount == 0) {
            return 0;
        }
        miniChefV2.harvest(pid, address(this));

        // sell rewards
        uint256 totalUsdc;

        uint256 synBalance = synToken.balanceOf(address(this));
        if (synBalance > 0) {
            uint256 synUsdc = UniswapV3Library._uniswapV3InputMultihopSwap(
                uniswapV3Router,
                address(synToken),
                address(wethToken),
                address(usdcToken),
                poolFee0,
                poolFee1,
                synBalance,
                0,
                address(this)
            );
            totalUsdc += synUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
