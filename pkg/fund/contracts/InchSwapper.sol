// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Inch.sol";

import "./interfaces/IInchSwapper.sol";
import "./interfaces/IBlockGetter.sol";
import "./interfaces/IRoleManager.sol";

contract InchSwapper is IInchSwapper, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    IInchRouter public inchRouter;
    address public blockGetter;
    mapping(address => mapping(address => Route)) private routePathsMap;
    IRoleManager public roleManager;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // blockGetter for arbitrum block (to update)
    // inchRouter is same for chain
    // roleManager is control role models
    function setParams(address _inchRouter, address _blockGetter, address _roleManager) public onlyAdmin {
        inchRouter = IInchRouter(_inchRouter);
        blockGetter = _blockGetter;
        roleManager = IRoleManager(_roleManager);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    // swap by strategy/smm/ets
    // only works if amount is lower (not on every rout we can increase it)
    // changes that acceptable: recipient, payer, amount
    // everyone can use it, however only unit users can see the path
    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) public {

        Route memory rout = routePathsMap[tokenIn][tokenOut];

        // require(rout.amount >= amountIn, "amount is more than saved");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(inchRouter), amountIn);

        if (rout.isUniV3) {
            uint256 returnAmount = inchRouter.uniswapV3Swap(
                amountIn,
                amountMinOut,
                rout.pools
            );
            IERC20(tokenOut).transfer(recipient, returnAmount);

        } else {
            IInchRouter.SwapDescriptionV5 memory desc = IInchRouter.SwapDescriptionV5({
                srcToken: tokenIn,
                dstToken: tokenOut,
                srcReceiver: payable(rout.srcReceiver),
                dstReceiver: payable(recipient),
                amount: amountIn,
                minReturnAmount: amountMinOut,
                flags: rout.flags
            });

            // do not need to pass "0x" to permit,
            // src receiver is same as caller, it's inch's executor
            inchRouter.swap(
                rout.srcReceiver,
                desc,
                "",
                rout.data
            );
        }
        routePathsMap[tokenIn][tokenOut].isUsed = true;

    }


    // update path of rout
    // params: tokenIn/tokenOut
    // big amount (1 mln)
    // flags (for patching/partial fill..)
    // srcReceiver (executor of rout)
    // path
    // pools for univ3
    // isUniv3 for difference between univ3swap and inchswap
    // isNew for neediness for update (used route)
    function updatePath(UpdateParams memory params, bytes memory path) external onlyUnit {
        require(params.tokenIn != params.tokenOut && params.tokenIn != address(0) && params.tokenOut != address(0), "wrong tokens");

        uint256 blockNumber;
        // arbitrum blockGetter
        if (blockGetter != address(0)) {
            blockNumber = IBlockGetter(blockGetter).getNumber();
        } else {
            blockNumber = block.number;
        }
        routePathsMap[params.tokenIn][params.tokenOut] = Route({
            updateBlock: blockNumber,
            amount: params.amount,
            flags: params.flags,
            srcReceiver: params.srcReceiver,
            data: path,
            isUniV3: params.isUniV3,
            pools: params.pools,
            isUsed: false
        });
    }

    // check path for update
    // only UnitUser can use it, whose are updating it
    function getPath(address tokenIn, address tokenOut) external onlyUnit view returns (Route memory) {
        return routePathsMap[tokenIn][tokenOut];
    }

}
