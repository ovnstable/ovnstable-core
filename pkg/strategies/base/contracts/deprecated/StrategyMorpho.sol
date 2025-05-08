// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@overnight-contracts/connectors/contracts/stuff/Morpho.sol";

contract StrategyMorpho is Strategy {

    // --- params

    IERC20 public usdcToken;
    IERC20 public wellToken;
    

    IMetaMorpho public mUsdcToken;
    ISwapRouter public uniswapV3Router;
    // IUniversalRewardsDistributor rewardsDistrubutor;
    IERC20 public morphoToken;
    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address mUsdc;
        address well;
        address morpho;
        // address rewardsDistrubutor;
        address uniswapV3Router;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdc);
        mUsdcToken = IMetaMorpho(params.mUsdc);
        wellToken = IERC20(params.well);
        morphoToken = IERC20(params.morpho);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");
        
        usdcToken.approve(address(mUsdcToken), _amount);
        mUsdcToken.deposit(_amount, address(this));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        mUsdcToken.withdraw(_amount, address(this), address(this));
        
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 _amount = mUsdcToken.balanceOf(address(this)) / 10 ** (mUsdcToken.decimals() - 6);
        mUsdcToken.withdraw(_amount, address(this), address(this));

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + mUsdcToken.balanceOf(address(this)) / 10 ** (mUsdcToken.decimals() - 6);
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + mUsdcToken.balanceOf(address(this)) / 10 ** (mUsdcToken.decimals() - 6);
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function claimMerkleTreeRewards(address _beneficiary, bytes[] memory data, address chainAgnosticBundler) public onlyPortfolioAgent {
        IChainAgnosticBundlerV2 bundler = IChainAgnosticBundlerV2(chainAgnosticBundler);

        uint256 startUsdcBalance = usdcToken.balanceOf(address(this));

        bundler.multicall(data);
        if (wellToken.balanceOf(address(this)) > 0) {
            wellToken.transfer(_beneficiary, wellToken.balanceOf(address(this)));
        }
        if (usdcToken.balanceOf(address(this)) > startUsdcBalance) {
            usdcToken.transfer(_beneficiary, usdcToken.balanceOf(address(this)) - startUsdcBalance);
        }
        if (morphoToken.balanceOf(address(this)) > 0) {
            morphoToken.transfer(_beneficiary, morphoToken.balanceOf(address(this)));
        }
    }
}
