import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as fs from "fs";
import * as zk from 'zksync-web3';


// load env file
import dotenv from "dotenv";
import { assert } from "chai";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

// The address of the NFT collection contract
const NFT_COLLECTION_ADDRESS = "0x5657A1278924839Fbc32EBAA29fcd475e23105f7";


// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Voting contract`);

  let url = ((hre.network.config) as HttpNetworkConfig).url
  console.log(`Running deploy script for the ERC721GatedPaymaster contract - ${url}...`);
  const provider = new zk.Provider(url);

  // Initialize the wallet.
  const wallet = new Wallet(PRIVATE_KEY);

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);

  const nftContractArtifact = await deployer.loadArtifact("MLVotingNFT");

  const nftContract = new zk.Contract(NFT_COLLECTION_ADDRESS, nftContractArtifact.abi, provider);


  console.log(`Checking balance of ${wallet.address} on ${NFT_COLLECTION_ADDRESS}`);
  let balance = await nftContract.balanceOf(wallet.address);
  console.log(`NFT Balance is ${balance}`);
  assert(balance == 1);

  const artifact = await deployer.loadArtifact("Voter");

  const deploymentFee = await deployer.estimateDeployFee(artifact, [NFT_COLLECTION_ADDRESS]);

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const voterContract = await deployer.deploy(artifact, [NFT_COLLECTION_ADDRESS]);

  // Show the contract info.
  const contractAddress = voterContract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);

  console.log("Done!");
}
