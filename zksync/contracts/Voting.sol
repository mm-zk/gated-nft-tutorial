//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


contract Voter {
    // NFT asset that allows voting.
    // The assumption is that the nft ids <= 255;
    IERC721 private immutable nft_asset;

    // Questions that exist (mapping from question hash)
    mapping (bytes32 => bool) public questions;
    // Mapping from question hash to bitmask of votes For.
    mapping (bytes32 => uint256) public votesFor;
    // Mapping from question hash to bitmask of votes Against.
    mapping (bytes32 => uint256) public votesAgainst;

    constructor(address _erc721) {
        nft_asset = IERC721(_erc721); // Initialize the ERC721 contract
    }

    function addQuestion(string memory question) public returns (bytes32 hashed_question) {
        require(
            nft_asset.balanceOf(msg.sender) > 0,
            "User does not hold the required NFT asset."
        );
        hashed_question = keccak256(abi.encodePacked(question));
        questions[hashed_question] = true;
    }

    function getVotes(string memory question) public view returns (uint256, uint256) {
        bytes32 hashed_question = keccak256(abi.encodePacked(question));
        require(questions[hashed_question], "This is not a correct question");
        return (votesFor[hashed_question], votesAgainst[hashed_question]);
    }

    function vote(string memory question, uint256 token_id, bool vote_for) public {
        require(token_id <= 255, "Token id too large");
        require(
            nft_asset.ownerOf(token_id) == msg.sender, "Sender is not the owner of the token"
        );
        bytes32 hashed_question = keccak256(abi.encodePacked(question));
        require(questions[hashed_question] == true, "Question is not known");
        require(((votesFor[hashed_question]|votesAgainst[hashed_question]) & (1<<token_id)) == 0 , "This token holder already voted");
        if (vote_for == true) {
            votesFor[hashed_question] |= (1<<token_id);
        } else {
            votesAgainst[hashed_question] |= (1<<token_id);
        }
    }

}
