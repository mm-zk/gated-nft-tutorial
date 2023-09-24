import { Provider, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as fs from "fs";
import * as zk from 'zksync-web3';

// load env file
import dotenv from "dotenv";
import { zeroPad } from "ethers/lib/utils";
import { assert } from "chai";
dotenv.config();

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";
// The address of the NFT collection contract
const NFT_COLLECTION_ADDRESS = "0x5657A1278924839Fbc32EBAA29fcd475e23105f7";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

if (!NFT_COLLECTION_ADDRESS)
  throw "⛔️ NFT_COLLECTION_ADDRESS not detected! Add it to the NFT_COLLECTION_ADDRESS variable!";

export default async function (hre: HardhatRuntimeEnvironment) {
  let url = ((hre.network.config) as HttpNetworkConfig).url
  console.log(`Running deploy script for the ERC721GatedPaymaster contract - ${url}...`);
  const provider = new Provider(url);

  // The wallet that will deploy the token and the paymaster
  // It is assumed that this wallet already has sufficient funds on zkSync
  const wallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);


  const nftContractArtifact = await deployer.loadArtifact("MLVotingNFT");

  const nftContract = new zk.Contract(NFT_COLLECTION_ADDRESS, nftContractArtifact.abi, provider);


  console.log(`Checking balance of ${wallet.address} on ${NFT_COLLECTION_ADDRESS}`);
  let balance = await nftContract.balanceOf(wallet.address);
  console.log(`NFT Balance is ${balance}`);
  assert(balance == 1);


  // Deploying the paymaster
  const paymasterArtifact = await deployer.loadArtifact("ERC721GatedPaymaster");
  const deploymentFee = await deployer.estimateDeployFee(paymasterArtifact, [
    NFT_COLLECTION_ADDRESS,
  ]);
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);
  // Deploy the contract
  const paymaster = await deployer.deploy(paymasterArtifact, [
    NFT_COLLECTION_ADDRESS,
  ]);
  console.log(`Paymaster address: ${paymaster.address}`);

  console.log("Funding paymaster with ETH");
  // Supplying paymaster with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.005"),
    })
  ).wait();

  let paymasterBalance = await provider.getBalance(paymaster.address);
  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

  console.log(`Done!`);
}
