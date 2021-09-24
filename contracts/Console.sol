// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library Console {
    event ConsoleLog(bool boolean);
    event ConsoleLog(int256 num);
    event ConsoleLog(uint256 num);
    event ConsoleLog(string str);
    // event ConsoleLog(bytes32 b32);
    event ConsoleLog(address addr);

    event ConsoleLogNamed(bytes32 label, bool boolean);
    event ConsoleLogNamed(bytes32 label, int256 num);
    event ConsoleLogNamed(bytes32 label, uint256 num);
    event ConsoleLogNamed(bytes32 label, string str);
    event ConsoleLogNamed(bytes32 label, bytes32 b32);
    event ConsoleLogNamed(bytes32 label, address addr);

    function log(bool x) public {
        emit ConsoleLog(x);
    }

    function log(int256 x) public {
        emit ConsoleLog(x);
    }

    function log(uint256 x) public {
        emit ConsoleLog(x);
    }

    function log(string memory x) public {
        emit ConsoleLog(x);
    }

    // function log(bytes32 x) public {
    //   emit ConsoleLog(x);
    // }

    function log(address x) public {
        emit ConsoleLog(x);
    }

    function log(bytes32 x, bool y) public {
        emit ConsoleLogNamed(x, y);
    }

    function log(bytes32 x, int256 y) public {
        emit ConsoleLogNamed(x, y);
    }

    function log(bytes32 x, uint256 y) public {
        emit ConsoleLogNamed(x, y);
    }

    function log(bytes32 x, string memory y) public {
        emit ConsoleLogNamed(x, y);
    }

    function log(bytes32 x, bytes32 y) public {
        emit ConsoleLogNamed(x, y);
    }

    function log(bytes32 x, address y) public {
        emit ConsoleLogNamed(x, y);
    }
}
