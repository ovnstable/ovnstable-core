// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;
pragma abicoder v2;


interface ICLPoolFenix {
    function globalState() 
    external
    view
    returns (
        uint160 price,
        int24 tick,
        uint16 lastFee,
        uint8 pluginConfig, 
        uint16 communityFee,
        bool unlocked
    );
}


