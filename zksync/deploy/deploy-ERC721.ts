import { Provider, Wallet } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as fs from "fs";
import * as readline from "readline";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getRecipientAddress(): Promise<string> {
  return new Promise((resolve, reject) => {
    rl.question(
      "Please provide the recipient address to receive an NFT: ",
      (address) => {
        if (!address) {
          reject("⛔️ RECIPIENT_ADDRESS not provided!");
        } else {
          resolve(address);
        }
      },
    );
  });
}

export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the ERC721 contract...`);

  // It is assumed that this wallet already has sufficient funds on zkSync
  const wallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  // Deploying the ERC721 contract
  const nftContractArtifact = await deployer.loadArtifact("MLVotingNFT");
  const nftContract = await deployer.deploy(nftContractArtifact, []);
  console.log(`NFT Contract address: ${nftContract.address}`);

  const recipientAddress = wallet.address;

  // Mint NFTs to the recipient address
  const tx = await nftContract.mint(recipientAddress);
  await tx.wait();
  console.log(`The NFT has been given to ${recipientAddress}`);

  // Get and log the balance of the recipient
  const balance = await nftContract.balanceOf(recipientAddress);
  console.log(`Balance of the recipient: ${balance}`);
  console.log(`Done!`);
}
