//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Greeter {
    string private greeting;
    address public last_sender;

    constructor(string memory _greeting) {
        greeting = _greeting;
        last_sender = msg.sender;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        last_sender = msg.sender;
        greeting = _greeting;
    }
}
