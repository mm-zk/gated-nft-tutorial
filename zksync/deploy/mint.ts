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


const addresses = [
    "0x71d84c3404a6ae258E6471d4934B96a2033F9438",
    "0xa00e749EAC6d9C1b78b916ab69f2B7E5990Eea77",
    "0x80b98826e7358274B1680311fDaCCE643547A3C3",
    "0x75aB01E47Aedb61A50e19993278505Ef6F578650",
    "0xEC0f95ba7d982fB91fF9084cce3D609D4DAC966B",
    "0x08d211E22dB19741FF25838A22e4e696FeE7eD36",
    "0x6FFb9fF6eb0b96E1e919519e3b6BFC65a2bE56a8",
    "0x8D88B37cC774f6696C60855d8AF913fcC54dd0f4",
    "0x4EEe5982e1F1289963C6600e899202348eD1C002",
    "0x01011C22936f09dcc375d87FCb71a3670385BF0e",
    "0xF626D38e4FBE6Ae01F36a79FE77a99E1f05A17BB",
    "0x9500570Cea581242938907fD4da9f716B45F29d7",
    "0xFac041BCF2c4b43319c2C0a39ABA53F4CbE44Fe5",
    "0x425D2c581fe64b19d64AecB798B4a2f78d9C2261",
    "0x6feAc50eb898eAd521558DFA61e6552F04F87954",
    "0x466ff3c5C76445823b49dF047d72663B8eAe9272",
    "0xF8f16B2591BBaac44A3715e290100F378FEA7046",
    "0xFb60921A1Dc09bFEDa73e26CB217B0fc76c41461",
    "0xF4de262aD5248f5993EB8d1E9e265a0319A49534",
    "0x6B10d5B49Cc1Be77C5A6bb3b94E5149fEB2D327D",
    "0xc6BeaC07a6FfEE4942164218E4208D761dc948DD",
    "0x2171713063917B7B5c0c0e7e2f843302BBbD9D1d",
    "0x5F33dD842c64250DB274863BBA05f0F54bF4b78B",
    "0xF25f95C59f4f1C4010527DAa26e7974cB37c2Ae1",
    "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295",
    "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    "0xc1792c7EB16aCa7e1d506728643099b313f95Dba",
    "0x6f2DD1D018dE4b7d12698127958bE1191a97D53e"
]

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

    const nftContract = new zk.Contract(NFT_COLLECTION_ADDRESS, nftContractArtifact.abi, wallet.connect(provider));


    console.log(`Checking balance of ${wallet.address} on ${NFT_COLLECTION_ADDRESS}`);
    let balance = await nftContract.balanceOf(wallet.address);
    console.log(`NFT Balance is ${balance}`);
    assert(balance == 1);

    for (let i = 0; i < addresses.length; i++) {
        const recipientAddress = addresses[i];
        const tx = await nftContract.mint(recipientAddress);
        await tx.wait();
        console.log(`The NFT has been given to ${recipientAddress}`);
    }
}
