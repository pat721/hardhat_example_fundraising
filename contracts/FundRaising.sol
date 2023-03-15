// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract FundRaising {
    event NewFundMessage(
        address from,
        uint256 timestamp,
        string name,
        string message
    );

    struct FundMessage {
        address from;
        uint256 timestamp;
        string name;
        string message;
    }

    FundMessage[] fundMessages;

    address payable public owner;
    string public fundingPurpose;
    uint public unlockDate;

    constructor(uint256 _unlockDate, string memory _fundingPurpose) {
        require(
            _unlockDate > block.timestamp,
            "The date for unlocking should be in the future"
        );
        unlockDate = _unlockDate;
        fundingPurpose = _fundingPurpose;
        owner = payable(msg.sender);
    }

    function fund(
        string memory _donorName,
        string memory _message
    ) public payable {
        require(msg.value > 0, "0 is not enough for funding");

        fundMessages.push(
            FundMessage(msg.sender, block.timestamp, _donorName, _message)
        );

        emit NewFundMessage(msg.sender, block.timestamp, _donorName, _message);
    }

    function withdrawFunds() public {
        require(block.timestamp >= unlockDate, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        owner.transfer(address(this).balance);
    }

    function getFundMessages() public view returns (FundMessage[] memory) {
        return fundMessages;
    }
}
