const allQuestions = ["first", "second", "third", "fourth", "fifth"];

State.init({
    accountBalance: 0,
    paymasterAccountBalance: 0,
    hasNFT: 0,
    nftId: -1,
    getVotes: Array.from({ length: allQuestions.length }, () => ["?", "?"]),
    questionsLoaded: false,
    addQuestion: "",
});

let account = Ethers.send("eth_requestAccounts", [])[0];
if (!account) return "Please connect wallet first";

const res = Ethers.send("wallet_switchEthereumChain", [{ chainId: "0x118" }]);

Ethers.provider()
    .getBalance(account)
    .then((data) => {
        State.update({
            accountBalance: parseInt(data.toString()) / 1000000000000000000,
        });
    });

const paymasterAccount = "0x52681C7B08F1EAce7f1aF6411DaCA9e28150edDE";
Ethers.provider()
    .getBalance(paymasterAccount)
    .then((data) => {
        State.update({
            paymasterAccountBalance: parseInt(data.toString()) / 1000000000000000000,
        });
    });

const nftABI = [
    {
        constant: true,
        inputs: [{ name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                name: "tokenId",
                type: "uint256",
            },
        ],
        name: "ownerOf",
        outputs: [
            {
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
const iface = new ethers.utils.Interface(nftABI);

const nftAddress = "0x5657a1278924839fbc32ebaa29fcd475e23105f7";

const encodedData = iface.encodeFunctionData("balanceOf", [account]);

const checkOwner = (nftId) => {
    const nftContract = new ethers.Contract(
        nftAddress,
        nftABI,
        Ethers.provider()
    );
    return nftContract
        .ownerOf(nftId)
        .then((data) => {
            if (data.toLowerCase() == account.toString()) {
                console.log("Found it");
                State.update({
                    nftId: nftId,
                });
            }
        })
        .catch((error) => { });
};

// My NFT doesn't provide the method to get the id for the user - so we simply loop over for now.
const guessNFTId = () => {
    if (state.nftId == -1) {
        state.nftId = -2;
        let promises = [];

        for (let i = 0; i < 40; i++) {
            console.log("Querying owner ofs ", i);
            promises.push(checkOwner(i));
        }
    }
};

Ethers.provider()
    .call({
        to: nftAddress,
        data: encodedData,
    })
    .then((data) => {
        const hasNFT = parseInt(data.toString());
        if (hasNFT) {
            guessNFTId();
        }
        State.update({
            hasNFT: hasNFT,
        });
    });

const votingABI = [
    {
        inputs: [
            {
                name: "question",
                type: "string",
            },
        ],
        name: "addQuestion",
        outputs: [
            {
                name: "hashed_question",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                name: "question",
                type: "string",
            },
        ],
        name: "getVotes",
        outputs: [
            {
                name: "",
                type: "uint256",
            },
            {
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                name: "",
                type: "bytes32",
            },
        ],
        name: "questions",
        outputs: [
            {
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                name: "question",
                type: "string",
            },
            {
                name: "token_id",
                type: "uint256",
            },
            {
                name: "vote_for",
                type: "bool",
            },
        ],
        name: "vote",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                name: "",
                type: "bytes32",
            },
        ],
        name: "votesAgainst",
        outputs: [
            {
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                name: "",
                type: "bytes32",
            },
        ],
        name: "votesFor",
        outputs: [
            {
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];

const votingAddress = "0x8711a970c431E51Ff1e68B2F7693E259f894c1a0";

Ethers.provider()
    .call({
        to: nftAddress,
        data: encodedData,
    })
    .then((data) => {
        State.update({
            hasNFT: parseInt(data.toString()),
        });
    });

const addQuestion = () => {
    const votingContract = new ethers.Contract(
        votingAddress,
        votingABI,
        Ethers.provider().getSigner()
    );
    votingContract.addQuestion(state.addQuestion).then((transactionHash) => {
        console.log("transaction hash is " + transactionHash);
    });
};

const votingContract = new ethers.Contract(
    votingAddress,
    votingABI,
    Ethers.provider()
);

const getVotesForQuestion = (question_id) => {
    votingContract
        .getVotes(allQuestions[question_id])
        .then((result) => {
            console.log("Got votes: " + result);

            state.getVotes[question_id][0] = result[0];
            state.getVotes[question_id][1] = result[1];

            console.log("Updated display");
            State.update({ getVotes: state.getVotes });
        })
        .catch((error) => {
            console.log(
                "Failed to fetch question: " + allQuestions[question_id] + " " + error
            );
        });
};

const refreshAllVotes = () => {
    allQuestions.map((name, index) => {
        getVotesForQuestion(index);
    });
};

const loadAllQuestions = () => {
    if (state.questionsLoaded == false) {
        state.questionsLoaded = true;
        refreshAllVotes();
    }
};

loadAllQuestions();

const vote = (decision, question_id) => {
    const votingContract = new ethers.Contract(
        votingAddress,
        votingABI,
        Ethers.provider().getSigner()
    );
    votingContract
        .vote(allQuestions[question_id], state.nftId, decision)
        .then((transactionHash) => {
            console.log("transaction hash is " + transactionHash);
        });
};

function getSignInput(transaction) {
    const maxFeePerGas = transaction.maxFeePerGas ?? transaction.gasPrice ?? 0;
    const maxPriorityFeePerGas = transaction.maxPriorityFeePerGas ?? maxFeePerGas;
    const gasPerPubdataByteLimit = transaction.customData?.gasPerPubdata ?? 50000;
    const signInput = {
        txType: transaction.type,
        from: transaction.from,
        to: transaction.to,
        gasLimit: transaction.gasLimit,
        gasPerPubdataByteLimit: gasPerPubdataByteLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymaster:
            transaction.customData?.paymasterParams?.paymaster ||
            ethers.constants.AddressZero,
        nonce: transaction.nonce,
        value: transaction.value,
        data: transaction.data,
        factoryDeps:
            transaction.customData?.factoryDeps?.map((dep) => hashBytecode(dep)) ||
            [],
        paymasterInput:
            transaction.customData?.paymasterParams?.paymasterInput || "0x",
    };
    return signInput;
}

function serialize(transaction) {
    if (!transaction.chainId) {
        console.log("Transaction chainId isn't set");
        return;
    }

    function formatNumber(value, name) {
        const result = ethers.utils.stripZeros(
            ethers.BigNumber.from(value).toHexString()
        );
        if (result.length > 32) {
            throw new Error("invalid length for " + name);
        }
        return result;
    }

    if (!transaction.from) {
        console.log(
            "Explicitly providing `from` field is reqiured for EIP712 transactions"
        );
        return;
    }
    const from = transaction.from;

    const meta = transaction.customData;

    let maxFeePerGas = transaction.maxFeePerGas || transaction.gasPrice || 0;
    let maxPriorityFeePerGas = transaction.maxPriorityFeePerGas || maxFeePerGas;

    const fields = [
        formatNumber(transaction.nonce || 0, "nonce"),
        formatNumber(maxPriorityFeePerGas, "maxPriorityFeePerGas"),
        formatNumber(maxFeePerGas, "maxFeePerGas"),
        formatNumber(transaction.gasLimit || 0, "gasLimit"),
        transaction.to != null ? ethers.utils.getAddress(transaction.to) : "0x",
        formatNumber(transaction.value || 0, "value"),
        transaction.data || "0x",
    ];

    // signature
    {
        fields.push(formatNumber(transaction.chainId, "chainId"));
        fields.push("0x");
        fields.push("0x");
    }
    fields.push(formatNumber(transaction.chainId, "chainId"));
    fields.push(ethers.utils.getAddress(from));

    // Add meta
    fields.push(formatNumber(meta.gasPerPubdata, "gasPerPubdata"));
    fields.push((meta.factoryDeps ?? []).map((dep) => ethers.utils.hexlify(dep)));

    if (
        meta.customSignature &&
        ethers.utils.arrayify(meta.customSignature).length == 0
    ) {
        console.log("Empty signatures are not supported");
        return;
    }
    fields.push(meta.customSignature || "0x");

    if (meta.paymasterParams) {
        fields.push([
            meta.paymasterParams.paymaster,
            ethers.utils.hexlify(meta.paymasterParams.paymasterInput),
        ]);
    } else {
        fields.push([]);
    }

    return ethers.utils.hexConcat([[0x71], ethers.utils.RLP.encode(fields)]);
}

const paymasterABI = [
    {
        inputs: [
            {
                name: "input",
                type: "bytes",
            },
        ],
        name: "general",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

const paymasterIface = new ethers.utils.Interface(paymasterABI);

const encodedPaymaster = paymasterIface.encodeFunctionData("general", ["0x"]);

const eip712Types = {
    Transaction: [
        { name: "txType", type: "uint256" },
        { name: "from", type: "uint256" },
        { name: "to", type: "uint256" },
        { name: "gasLimit", type: "uint256" },
        { name: "gasPerPubdataByteLimit", type: "uint256" },
        { name: "maxFeePerGas", type: "uint256" },
        { name: "maxPriorityFeePerGas", type: "uint256" },
        { name: "paymaster", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "factoryDeps", type: "bytes32[]" },
        { name: "paymasterInput", type: "bytes" },
    ],
};

function signCustom(transaction) {
    const domain = {
        name: "zkSync",
        version: "2",
        chainId: transaction.chainId,
    };

    console.log("About to get sign input");
    console.log(getSignInput(transaction));

    return Ethers.provider()
        .getSigner()
        ._signTypedData(domain, eip712Types, getSignInput(transaction));
}

function getSignedDigest(transaction) {
    if (!transaction.chainId) {
        throw Error("Transaction chainId isn't set");
    }
    const domain = {
        name: "zkSync",
        version: "2",
        chainId: transaction.chainId,
    };
    console.log("in get signed");

    console.log(getSignInput(transaction));
    return ethers.utils._TypedDataEncoder.hash(
        domain,
        eip712Types,
        getSignInput(transaction)
    );
}

function getSignature(transaction, ethSignature) {
    if (
        transaction?.customData?.customSignature &&
        transaction.customData.customSignature.length
    ) {
        return ethers.utils.arrayify(transaction.customData.customSignature);
    }

    if (!ethSignature) {
        throw new Error("No signature provided");
    }

    const r = ethers.utils.zeroPad(ethers.utils.arrayify(ethSignature.r), 32);
    const s = ethers.utils.zeroPad(ethers.utils.arrayify(ethSignature.s), 32);
    const v = ethSignature.v;

    return [...r, ...s, v];
}

function eip712TxHash(transaction, ethSignature) {
    const signedDigest = getSignedDigest(transaction);
    const hashedSignature = ethers.utils.keccak256(
        getSignature(transaction, ethSignature)
    );

    return ethers.utils.keccak256(
        ethers.utils.hexConcat([signedDigest, hashedSignature])
    );
}

const EIP712_TX_TYPE = 0x71;

function parseTransaction(payload) {
    function handleAddress(value) {
        if (value === "0x") {
            return null;
        }
        return ethers.utils.getAddress(value);
    }

    function handleNumber(value) {
        if (value === "0x") {
            return ethers.BigNumber.from(0);
        }
        return ethers.BigNumber.from(value);
    }

    function arrayToPaymasterParams(arr) {
        if (arr.length == 0) {
            return undefined;
        }
        if (arr.length != 2) {
            console.log(
                `Invalid paymaster parameters, expected to have length of 2, found ${arr.length}`
            );
            return undefined;
        }

        return {
            paymaster: ethers.utils.getAddress(arr[0]),
            paymasterInput: ethers.utils.arrayify(arr[1]),
        };
    }

    const bytes = ethers.utils.arrayify(payload);
    if (bytes[0] != EIP712_TX_TYPE) {
        return ethers.utils.parseTransaction(bytes);
    }

    const raw = ethers.utils.RLP.decode(bytes.slice(1));
    const transaction = {
        type: EIP712_TX_TYPE,
        nonce: handleNumber(raw[0]).toNumber(),
        maxPriorityFeePerGas: handleNumber(raw[1]),
        maxFeePerGas: handleNumber(raw[2]),
        gasLimit: handleNumber(raw[3]),
        to: handleAddress(raw[4]),
        value: handleNumber(raw[5]),
        data: raw[6],
        chainId: handleNumber(raw[10]),
        from: handleAddress(raw[11]),
        customData: {
            gasPerPubdata: handleNumber(raw[12]),
            factoryDeps: raw[13],
            customSignature: raw[14],
            paymasterParams: arrayToPaymasterParams(raw[15]),
        },
    };

    const ethSignature = {
        v: handleNumber(raw[7]).toNumber(),
        r: raw[8],
        s: raw[9],
    };

    if (
        (ethers.utils.hexlify(ethSignature.r) == "0x" ||
            ethers.utils.hexlify(ethSignature.s) == "0x") &&
        !transaction.customData.customSignature
    ) {
        return transaction;
    }

    if (
        ethSignature.v !== 0 &&
        ethSignature.v !== 1 &&
        !transaction.customData.customSignature
    ) {
        throw new Error("Failed to parse signature");
    }

    if (!transaction.customData.customSignature) {
        transaction.v = ethSignature.v;
        transaction.s = ethSignature.s;
        transaction.r = ethSignature.r;
    }

    transaction.hash = eip712TxHash(transaction, ethSignature);

    return transaction;
}

const voteForFree = (decision, question_id) => {
    const votingContract = new ethers.Contract(
        votingAddress,
        votingABI,
        Ethers.provider().getSigner()
    );
    votingContract.populateTransaction
        .vote(allQuestions[question_id], state.nftId, decision)
        .then((populatedTransaction) => {
            populatedTransaction;
            Ethers.provider()
                .getTransactionCount(account, "latest")
                .then((nonce) => {
                    Ethers.provider()
                        .getNetwork()
                        .then((network) => {
                            populatedTransaction.type = 0x71;
                            populatedTransaction.nonce = nonce;
                            populatedTransaction.chainId = network.chainId;
                            populatedTransaction.gasPrice = 250000000;
                            // 10M
                            populatedTransaction.gasLimit = 10000000;
                            populatedTransaction.value = 0;

                            populatedTransaction.customData = {
                                gasPerPubdata: 800,
                                factoryDeps: [],
                                paymasterParams: {
                                    paymaster: "0x52681C7B08F1EAce7f1aF6411DaCA9e28150edDE",
                                    paymasterInput: encodedPaymaster,
                                },
                            };
                            signCustom(populatedTransaction).then((signature) => {
                                populatedTransaction.customData.customSignature = signature;

                                console.log("populated Transaction");
                                console.log(populatedTransaction);

                                const bytes = serialize(populatedTransaction);

                                console.log(bytes);
                                const provider = Ethers.provider();
                                provider.formatter.transaction = parseTransaction;

                                provider.sendTransaction(bytes).then((result) => {
                                    console.log("Transaction sent");
                                    console.log(result);
                                    result.wait().then((receipt) => {
                                        console.log("got receipt");
                                        console.log(receipt);
                                        getVotesForQuestion(question_id);
                                    })
                                });
                            });
                        });
                });
        });
    return;
};

function checkIfVoted(bn) {
    if (state.nftId >= 0 && state.nftId < 255) {
        return bn.shr(state.nftId).and(1).eq(1);
    }
    return true;
}


const renderButtons = (index) => {
    if (state.hasNFT) {
        if (state.getVotes[index][0] == '?') {
            return <span>Question not found</span>;
        }
        if (checkIfVoted(state.getVotes[index][0].or(state.getVotes[index][1]))) {
            return <span>Already voted</span>;
        }

        return (
            <span>
                <button onClick={() => vote(true, index)}>Vote YES</button>
                <button onClick={() => vote(false, index)}>Vote NO</button>
                <button onClick={() => voteForFree(true, index)}>
                    Vote YES (free with paymaster)
                </button>
                <button onClick={() => voteForFree(false, index)}>
                    Vote NO (free with paymaster)
                </button>
            </span>
        );
    } else {
        return <span>NFT needed to vote</span>;
    }
};


function countVotes(bn) {
    if (bn == "?") {
        return "?";
    }

    let count = 0;

    while (!bn.isZero()) {
        if (bn.and(1).eq(1)) {
            count++;
        }
        bn = bn.shr(1);
    }

    return count;
}

return (
    <>
        <div class="container border border-info p-3 text-center">
            <h1>Welcome to voting page</h1><br />

            You can vote only if you are the owner of the NFT.<br />

            Clicking Vote yes / no  - will create a regular transaction.<br />
            Clicking Vote using paymaster - will create a transaction, but you will not have to pay for gas (assuming paymaster have funds remaining).
            <br /><br />

            <p>
                {"Your zkSync account is:"}
                {account}
            </p>
            <p>
                {" Balance is: "} {state.accountBalance}
            </p>
            <p>
                {" "}
                {" Paymaster balance: "} {state.paymasterAccountBalance}
            </p>
            <p>
                {" Has NFT is: "} {state.hasNFT} {" id"} {state.nftId}
            </p>
            <p>
                {state.hasNFT ? (
                    <h1 style={{ color: "green" }}> You have NFT {state.nftId >= 0 ? "( " + state.nftId + " )" : ""} </h1>
                ) : (
                    <h1 style={{ color: "red" }}> NO NFT </h1>
                )}
            </p>

            <p>
                {allQuestions.map((name, index) => (
                    <p>
                        {" "}
                        {"Question "} {index} {" is: "}
                        <b> {name}</b> <br /> {"Current votes: +"}{" "}
                        {countVotes(state.getVotes[index][0])} {" - "}
                        {countVotes(state.getVotes[index][1])}
                        <br />
                        {renderButtons(index)}
                    </p>
                ))}
            </p>

            <input
                value={state.addQuestion}
                onChange={(e) => State.update({ addQuestion: e.target.value })}
                placeholder="Your question"
            />
            <button onClick={() => addQuestion()}>Add question</button>
        </div>
    </>
);
