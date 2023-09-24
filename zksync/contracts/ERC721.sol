// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MLVotingNFT is ERC721, Ownable {
  uint256 public tokenId;

  constructor() ERC721("ML Voting", "VOTE") {}

  function mint(address recipient) public onlyOwner {
    require(recipient != address(0), "recipient must not be the zero address");
    _safeMint(recipient, tokenId);
    tokenId++;
  }
}
