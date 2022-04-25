// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/BeethovenxExchange.sol";
import "./libraries/LowGasSafeMath.sol";
import "./connectors/uniswap/v2/interfaces/IUniswapV2Router02.sol";
import "./connectors/uniswap/v2/interfaces/IUniswapV2Pair.sol";
import "./connectors/spookyswap/MasterChef.sol";

import "hardhat/console.sol";

contract StrategySpookySwapMaiUsdc is Strategy, BeethovenExchange {
    using LowGasSafeMath for uint256;

    IERC20 public maiToken;
    IERC20 public usdcToken;
    IERC20 public booToken;

    IUniswapV2Router02 public router;
    IUniswapV2Pair public lpToken;
    MasterChef public masterChef;
    uint256 public pid;
    bytes32 public poolIdMaiUsdc;
    bytes32 public poolIdBooUsdc;


    // --- events

    event StrategySpookySwapMaiUsdcUpdatedTokens(address maiToken, address usdcToken, address booToken);

    event StrategySpookySwapMaiUsdcUpdatedParams(address router, address lpToken, address masterChef, uint256 pid,
        address beethovenxVault, bytes32 poolIdMaiUsdc, bytes32 poolIdBooUsdc);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setTokens(
        address _maiToken,
        address _usdcToken,
        address _booToken
    ) external onlyAdmin {

        require(_maiToken != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_booToken != address(0), "Zero address not allowed");

        maiToken = IERC20(_maiToken);
        usdcToken = IERC20(_usdcToken);
        booToken = IERC20(_booToken);

        emit StrategySpookySwapMaiUsdcUpdatedTokens(_maiToken, _usdcToken, _booToken);
    }

    function setParams(
        address _router,
        address _lpToken,
        address _masterChef,
        uint256 _pid,
        address _beethovenxVault,
        bytes32 _poolIdMaiUsdc,
        bytes32 _poolIdBooUsdc
    ) external onlyAdmin {

        require(_router != address(0), "Zero address not allowed");
        require(_lpToken != address(0), "Zero address not allowed");
        require(_masterChef != address(0), "Zero address not allowed");
        require(_beethovenxVault != address(0), "Zero address not allowed");
        require(_poolIdMaiUsdc != "", "Empty pool id not allowed");
        require(_poolIdBooUsdc != "", "Empty pool id not allowed");

        router = IUniswapV2Router02(_router);
        lpToken = IUniswapV2Pair(_lpToken);
        masterChef = MasterChef(_masterChef);
        pid = _pid;
        poolIdMaiUsdc = _poolIdMaiUsdc;
        poolIdBooUsdc = _poolIdBooUsdc;

        setBeethovenxVault(_beethovenxVault);

        emit StrategySpookySwapMaiUsdcUpdatedParams(_router, _lpToken, _masterChef, _pid, _beethovenxVault, _poolIdMaiUsdc, _poolIdBooUsdc);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        require(reserveUsdc > 1000 && reserveMai > 1000, 'StrategySpookySwapMaiUsdc: Liquidity lpToken reserves too low');

        // count amount mai to swap
        uint256 maiBalance = maiToken.balanceOf(address(this));
        uint256 amountUsdcFromMai;
        if (maiBalance > 0) {
            amountUsdcFromMai = onSwap(
                poolIdMaiUsdc,
                IVault.SwapKind.GIVEN_IN,
                maiToken,
                usdcToken,
                maiBalance
            );
        }
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 amountUsdcToSwap = _getAmountUsdcToSwap(usdcBalance - amountUsdcFromMai, reserveUsdc, reserveMai);

        // swap usdc to mai
        swap(
            poolIdMaiUsdc,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdcToken)),
            IAsset(address(maiToken)),
            address(this),
            address(this),
            amountUsdcToSwap,
            0
        );

        // add liquidity
        usdcBalance = usdcToken.balanceOf(address(this));
        maiBalance = maiToken.balanceOf(address(this));
        usdcToken.approve(address(router), usdcBalance);
        maiToken.approve(address(router), maiBalance);
        router.addLiquidity(
            address(usdcToken),
            address(maiToken),
            usdcBalance,
            maiBalance,
            1,
            1,
            address(this),
            block.timestamp + 600
        );
        usdcBalance = usdcToken.balanceOf(address(this));
        maiBalance = maiToken.balanceOf(address(this));
        console.log("usdcBalance: %s", usdcBalance);
        console.log("maiBalance: %s", maiBalance);

        // deposit lpTokens to masterChef
        uint256 lpBalance = lpToken.balanceOf(address(this));
        lpToken.approve(address(masterChef), lpBalance);
        masterChef.deposit(pid, lpBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 lpBalanceUser, ) = masterChef.userInfo(pid, address(this));
        require(lpBalanceUser > 0, "Lp Balance = 0");

        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        require(reserveUsdc > 1000 && reserveMai > 1000, 'StrategySpookySwapMaiUsdc: Liquidity lpToken reserves too low');

        // count amount to unstake
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        if (usdcBalance >= _amount) {
            return _amount;
        }
        uint256 maiBalance = maiToken.balanceOf(address(this));
        if (maiBalance > 0) {
            uint256 amountUsdcFromMai = onSwap(
                poolIdMaiUsdc,
                IVault.SwapKind.GIVEN_IN,
                maiToken,
                usdcToken,
                maiBalance
            );
            uint256 totalAmountUsdc = usdcBalance + amountUsdcFromMai;
            if (totalAmountUsdc >= _amount) {
                swap(
                    poolIdMaiUsdc,
                    IVault.SwapKind.GIVEN_IN,
                    IAsset(address(maiToken)),
                    IAsset(address(usdcToken)),
                    address(this),
                    address(this),
                    maiBalance,
                    0
                );
                usdcBalance = usdcToken.balanceOf(address(this));
                if (usdcBalance >= _amount) {
                    return _amount;
                }
            }
        }
        uint256 totalLpBalance = lpToken.totalSupply();
        uint256 lpBalance = _getAmountLPTokensForWithdraw(_amount - usdcBalance, reserveUsdc, reserveMai, totalLpBalance);
        if (lpBalance > lpBalanceUser) {
            lpBalance = lpBalanceUser;
        }

        // withdraw lpTokens from masterChef
        masterChef.withdraw(pid, lpBalance);

        // remove liquidity
        lpToken.approve(address(router), lpBalance);
        router.removeLiquidity(
            lpToken.token0(),
            lpToken.token1(),
            lpBalance,
            0,
            0,
            address(this),
            block.timestamp + 600
        );

        // swap mai to usdc
        maiBalance = maiToken.balanceOf(address(this));
        swap(
            poolIdMaiUsdc,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(maiToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            maiBalance,
            0
        );

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 lpBalanceUser, ) = masterChef.userInfo(pid, address(this));
        require(lpBalanceUser > 0, "Lp Balance = 0");

        // withdraw lpTokens from masterChef
        masterChef.withdraw(pid, lpBalanceUser);

        // remove liquidity
        lpToken.approve(address(router), lpBalanceUser);
        router.removeLiquidity(
            lpToken.token0(),
            lpToken.token1(),
            lpBalanceUser,
            0,
            0,
            address(this),
            block.timestamp + 600
        );

        // swap mai to usdc
        uint256 maiBalance = maiToken.balanceOf(address(this));
        swap(
            poolIdMaiUsdc,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(maiToken)),
            IAsset(address(usdcToken)),
            address(this),
            address(this),
            maiBalance,
            0
        );

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        (uint256 lpBalance, ) = masterChef.userInfo(pid, address(this));
        if (lpBalance == 0) {
            return 0;
        }
        uint256 totalLpBalance = lpToken.totalSupply();
        (uint256 reserveUsdc, uint256 reserveMai,) = lpToken.getReserves();
        uint256 usdcBalance = reserveUsdc * lpBalance / totalLpBalance + usdcToken.balanceOf(address(this));
        uint256 maiBalance = reserveMai * lpBalance / totalLpBalance + maiToken.balanceOf(address(this));

        uint256 usdcBalanceFromMai = onSwap(
            poolIdMaiUsdc,
            IVault.SwapKind.GIVEN_IN,
            maiToken,
            usdcToken,
            maiBalance
        );

        return usdcBalance + usdcBalanceFromMai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        // claim rewards
        masterChef.withdraw(pid, 0);

        // sell rewards
        uint256 totalUsdc;

        uint256 booBalance = booToken.balanceOf(address(this));
        if (booBalance != 0) {
            uint256 booUsdc = swap(
                poolIdBooUsdc,
                IVault.SwapKind.GIVEN_IN,
                IAsset(address(booToken)),
                IAsset(address(usdcToken)),
                address(this),
                address(this),
                booBalance,
                0
            );
            totalUsdc += booUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));
        return totalUsdc;
    }

    function _getAmountToUnstake(uint256 _amount) internal returns (uint256) {
        if (_amount < 10 ** 4) {
            return _amount + 10;
        } else {
            return _amount * 1001 / 1000;
        }
    }

    function _getAmountUsdcToSwap(
        uint256 amount,
        uint256 reserveUsdc,
        uint256 reserveMai
    ) internal view returns (uint256) {
        uint256 USDCtoMAI = 1000000000000;
        uint256 amountUsdcToSwap = (amount * reserveMai) / (reserveMai + reserveUsdc * USDCtoMAI);
        for (uint i = 0; i < 2; i++) {
            uint256 ons = onSwap(
                poolIdMaiUsdc,
                IVault.SwapKind.GIVEN_IN,
                usdcToken,
                maiToken,
                amountUsdcToSwap
            );
            USDCtoMAI = ons / amountUsdcToSwap;
            amountUsdcToSwap = (amount * reserveMai) / (reserveMai + reserveUsdc * USDCtoMAI);
        }
        return amountUsdcToSwap;
    }

    function _getAmountLPTokensForWithdraw(
        uint256 amount,
        uint256 reserveUsdc,
        uint256 reserveMai,
        uint256 totalLpBalance
    ) internal view returns (uint256) {
        uint256 MAItoUSDC = 1000000000000;
        uint256 lpBalance;
        for (uint i = 0; i < 2; i++) {
            lpBalance = (totalLpBalance * MAItoUSDC * amount) / (reserveMai + reserveUsdc * MAItoUSDC);
            uint256 rdd = reserveMai * lpBalance / totalLpBalance;
            uint256 ons = onSwap(
                poolIdMaiUsdc,
                IVault.SwapKind.GIVEN_IN,
                maiToken,
                usdcToken,
                rdd
            );
            MAItoUSDC = rdd / ons;
        }
        lpBalance = (totalLpBalance * MAItoUSDC * amount) / (reserveMai + reserveUsdc * MAItoUSDC);
        return lpBalance;
    }
}
