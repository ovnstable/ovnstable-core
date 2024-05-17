// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IInsuranceExchange.sol";
import "./interfaces/IAssetOracle.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IRebaseToken.sol";
import "./interfaces/IBlockGetter.sol";


contract InsuranceExchange is IInsuranceExchange, Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using WadRayMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant INSURED_ROLE = keccak256("INSURED_ROLE");
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    uint256 public constant DM = 1e5;

    IERC20 public asset; // OVN address
    IRebaseToken public rebase;
    address public odosRouter;

    uint256 public mintFee;
    uint256 public redeemFee;

    uint256 public lastBlockNumber;
    uint256 public swapSlippage;

    uint256 public nextPayoutTime;
    uint256 public payoutPeriod;
    uint256 public payoutTimeRange;

    mapping(address => uint256) public withdrawRequests;
    uint256 public requestWaitPeriod;
    uint256 public withdrawPeriod;

    IAssetOracle public assetOracle;
    IRoleManager public roleManager;
    address public blockGetter;

    struct SetUpParams {
        address asset;
        address rebase;
        address odosRouter;
        address assetOracle;
        address roleManager;
    }

    event PayoutEvent(int256 profit, uint256 newLiquidityIndex);
    event MintBurn(string label, uint256 amount, uint256 fee, address sender);
    event NextPayoutTime(uint256 nextPayoutTime);
    event BlockGetterUpdated(address blockGetter);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public  {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        mintFee = 0;
        redeemFee = 0;

        lastBlockNumber = block.number;

        nextPayoutTime = block.timestamp;
        payoutPeriod = 24 * 60 * 60;
        payoutTimeRange = 8 * 60 * 60; // 8 hours

        // 3 day in seconds
        requestWaitPeriod = 259200;

        // 4 day in seconds
        withdrawPeriod = 345600;

        swapSlippage = 500; // 5%

        _setRoleAdmin(UNIT_ROLE, PORTFOLIO_AGENT_ROLE);
    }


    function _authorizeUpgrade(address newImplementation)
    internal
    onlyAdmin
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyInsured() {
        require(hasRole(INSURED_ROLE, msg.sender), "Restricted to Insured");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    modifier oncePerBlock() {

        uint256 blockNumber;
        if (blockGetter != address(0)) {
            blockNumber = IBlockGetter(blockGetter).getNumber();
        } else {
            blockNumber = block.number;
        }

        require(lastBlockNumber < blockNumber, "Only once in block");
        lastBlockNumber = blockNumber;
        _;
    }

    function setUpParams(SetUpParams calldata params) external onlyAdmin {
        asset = IERC20(params.asset);
        rebase = IRebaseToken(params.rebase);
        odosRouter = params.odosRouter;
        assetOracle = IAssetOracle(params.assetOracle);
        roleManager = IRoleManager(params.roleManager);
    }

    function setBlockGetter(address _blockGetter) external onlyAdmin {
        // blockGetter can be empty
        blockGetter = _blockGetter;
        emit BlockGetterUpdated(_blockGetter);
    }

    function setAssetOracle(address _assetOracle) external onlyAdmin {
        require(_assetOracle != address(0), "Zero assetOracle not allowed");
        assetOracle = IAssetOracle(_assetOracle);
    }


    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyPortfolioAgent {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
    }

    function setMintFee(uint256 _fee) external onlyPortfolioAgent {
        mintFee = _fee;
    }

    function setRedeemFee(uint256 _fee) external onlyPortfolioAgent {
        redeemFee = _fee;
    }

    function setWithdrawPeriod(uint256 _requestWaitPeriod, uint256 _withdrawPeriod) external onlyPortfolioAgent {
        requestWaitPeriod = _requestWaitPeriod;
        withdrawPeriod = _withdrawPeriod;
    }

    function setSwapSlippage(uint256 _swapSlippage) external onlyPortfolioAgent {
        require(_swapSlippage != 0, "Zero swapSlippage not allowed");
        swapSlippage = _swapSlippage;
    }

    function mint(InputMint calldata input) external whenNotPaused oncePerBlock {
        _mint(input.amount);
    }

    function _mint(uint256 _amount) internal {
        require(_amount > 0, "Amount of asset is zero");
        require(asset.balanceOf(msg.sender) >= _amount, "Not enough tokens to mint");

        asset.transferFrom(msg.sender, address(this), _amount);

        uint256 rebaseAmount = _assetToRebaseAmount(_amount);
        uint256 fee;
        (rebaseAmount, fee) = _takeFee(rebaseAmount, true);

        require(rebaseAmount > 0, "Rebase Amount is zero");
        rebase.mint(msg.sender, rebaseAmount);

        delete withdrawRequests[msg.sender];
        emit MintBurn('mint', rebaseAmount, fee, msg.sender);
    }

    function _takeFee(uint256 _amount, bool isMint) internal view returns (uint256, uint256){

        uint256 fee = isMint ? mintFee : redeemFee;

        uint256 feeAmount = (_amount * fee) / DM;
        uint256 resultAmount = _amount - feeAmount;

        return (resultAmount, feeAmount);
    }


    function redeem(InputRedeem calldata input) external whenNotPaused oncePerBlock {
        _redeem(input.amount);
    }

    function _redeem(uint256 _amount) internal {
        require(_amount > 0, "Amount of asset is zero");
        require(rebase.balanceOf(msg.sender) >= _amount, "Not enough tokens to redeem");

        checkWithdraw();

        uint256 fee;
        uint256 amountFee;
        (amountFee, fee) = _takeFee(_amount, false);

        uint256 assetAmount = _rebaseAmountToAsset(amountFee);
        require(assetAmount > 0, "Amount of asset is zero");

        require(asset.balanceOf(address(this)) >= assetAmount, "Not enough for transfer");

        asset.transfer(msg.sender, assetAmount);
        rebase.burn(msg.sender, _amount);

        delete withdrawRequests[msg.sender];
        emit MintBurn('redeem', _amount, fee, msg.sender);
    }

    function _assetToRebaseAmount(uint256 _assetAmount) internal returns (uint256) {
        uint256 rebaseDecimals = rebase.decimals();
        uint256 assetDecimals = IERC20Metadata(address(asset)).decimals();

        uint256 _rebaseAmount;
        if (assetDecimals > rebaseDecimals) {
            _rebaseAmount = _assetAmount / (10 ** (assetDecimals - rebaseDecimals));
        } else {
            _rebaseAmount = _assetAmount * (10 ** (rebaseDecimals - assetDecimals));
        }
        return _rebaseAmount;

    }

    function _rebaseAmountToAsset(uint256 _rebaseAmount) internal returns (uint256) {

        uint256 _assetAmount;
        uint256 assetDecimals = IERC20Metadata(address(asset)).decimals();
        uint256 rebaseDecimals = rebase.decimals();
        if (assetDecimals > rebaseDecimals) {
            _assetAmount = _rebaseAmount * (10 ** (assetDecimals - rebaseDecimals));
        } else {
            _assetAmount = _rebaseAmount / (10 ** (rebaseDecimals - assetDecimals));
        }
        return _assetAmount;

    }

    function requestWithdraw() external whenNotPaused {
        withdrawRequests[msg.sender] = block.timestamp + requestWaitPeriod;
    }

    function checkWithdraw() public view {

        uint256 date = withdrawRequests[msg.sender];
        uint256 currentDate = block.timestamp;

        uint256 withdrawDate = date + withdrawPeriod;

        require(date != 0, 'need withdraw request');
        require(date < currentDate, 'requestWaitPeriod');
        require(withdrawDate > currentDate, 'withdrawPeriod');
    }

    /**
     * @dev This function is calling when USD+ (or other plus) make payout and there are extra value.
     * This method should convert this asset to OVN.
     * @param swapData consist of odos data to make swap
     */
    function premium(SwapData memory swapData, uint256 premiumAmount) external onlyInsured {
        require(premiumAmount >= swapData.amountIn, 'premiumAmount >= amountIn');
        _swap(swapData);
    }

    /**
     * @dev This function is calling when USD+ (or other plus) make payout and there are some loss value.
     * This method should convert some OVN to outputToken and transfer it to the PortfolioManager contract.
     * @param swapData consist of odos data to make swap
     * @param outputAmount needed amount of outputToken (USDC|USDT|DAI) to cover the loss
     * @param to recipient of assets
     */
    function compensate(SwapData memory swapData, uint256 outputAmount, address to) external onlyInsured {
        require(swapData.inputTokenAddress == address(asset), 'asset != swapData.inputToken');

        IERC20 outputToken = IERC20(swapData.outputTokenAddress);
        uint256 expectedAmountOut = assetOracle.convert(address(asset), address(swapData.outputTokenAddress), swapData.amountIn);

        _swap(swapData);

        uint256 amountOut = outputToken.balanceOf(address(this));
        require(amountOut < expectedAmountOut * (10000 + swapSlippage) / 10000, 'swapped too much');

        outputToken.transfer(to, outputAmount);
    }

    function _swap(SwapData memory swapData) internal {

        IERC20 inputAsset = IERC20(swapData.inputTokenAddress);
        IERC20 outputAsset = IERC20(swapData.outputTokenAddress);

        IERC20 usdAsset = address(inputAsset) == address(asset) ? outputAsset : inputAsset;

        inputAsset.approve(odosRouter, swapData.amountIn);

        uint256 balanceInBefore = inputAsset.balanceOf(address(this));
        uint256 balanceOutBefore = outputAsset.balanceOf(address(this));
        inputAsset.approve(odosRouter, swapData.amountIn);
        (bool success,) = odosRouter.call{value : 0}(swapData.data);
        require(success, "router swap invalid");
        uint256 balanceInAfter = inputAsset.balanceOf(address(this));
        uint256 balanceOutAfter = outputAsset.balanceOf(address(this));

        uint256 amountIn = balanceInBefore - balanceInAfter;
        uint256 amountOut = balanceOutAfter - balanceOutBefore;

        uint256 outAmountMin = assetOracle.convert(address(inputAsset), address(outputAsset), amountIn);
        outAmountMin = outAmountMin * (10000 - swapSlippage) / 10000;

        require(amountOut > outAmountMin, 'Large swap slippage');
    }

    function payout() external whenNotPaused oncePerBlock onlyUnit {

        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        uint256 totalAsset = asset.balanceOf(address(this));
        totalAsset = _assetToRebaseAmount(totalAsset);

        int256 profit = int256(totalAsset) - int256(rebase.totalSupply());

        uint256 newLiquidityIndex = totalAsset.wadToRay().rayDiv(rebase.scaledTotalSupply());
        rebase.setLiquidityIndex(newLiquidityIndex);

        emit PayoutEvent(profit, newLiquidityIndex);

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }

}
