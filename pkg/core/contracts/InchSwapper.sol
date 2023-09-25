// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IControlRole.sol";
import "./interfaces/IInchSwapper.sol";
import "./interfaces/IInchConversion.sol";


contract InchSwapper is IInchSwapper, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    address public inchRouter;

    struct RoutePath {
        address from;
        address to;
        bytes data;
    }
    
    mapping(address => mapping(address => bytes)) private routePathsMap;

    /// @notice Info of each path;
    // RoutePath[] public routePaths;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _inchRouter) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        inchRouter = _inchRouter;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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

    // --- setters

    function registerPath(address tokenIn, address tokenOut) public onlyAdmin {
        require(tokenIn != address(0) && tokenOut != address(0), "Zero address not allowed");
        // routePaths.push(
        //     RoutePath({
        //         from: tokenIn,
        //         to: tokenOut,
        //         data: ""
        //     })
        // );
        routePathsMap[tokenIn][tokenOut] = "";

    }
    
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) public {        

        IInchRouter router = IInchRouter(inchRouter);
        // swap inch v5
        IInchRouter.SwapDescriptionV5 memory desc = IInchRouter.SwapDescriptionV5({
            srcToken: tokenIn,
            dstToken: tokenOut,
            srcReceiver: payable(msg.sender),
            dstReceiver: payable(msg.sender),
            amount: amountIn,
            minReturnAmount: amountMinOut,
            flags: 0
        });

        router.swap(
            msg.sender,
            desc,
            "0x",
            routePathsMap[tokenIn][tokenOut]
        );

    }
    
    function getPath(address tokenIn, address tokenOut) public view returns(bytes memory) {
        return routePathsMap[tokenIn][tokenOut];

    }

    function updatePath(address tokenIn, address tokenOut, bytes calldata path) public onlyAdmin {
        routePathsMap[tokenIn][tokenOut] = path;
    }

    


    uint256[46] private __gap;
}
