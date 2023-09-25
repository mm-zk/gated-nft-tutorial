const allQuestions = [
    "Did you use zksyncEra before this experiment?",
    "Is 1$ a day enough for stipend?",
    "Are you using zkSyncEra daily?",
    "Did you ever use paymaster?",
    "Can you answer this question without paymaster?",
    "Did you eat breakfast today?",
    "Can you answer NO this to question?",
    "Do you like this form?"
];

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
        .then((transaction) => {
            console.log("transaction sent ");
            console.log(transaction);
            transaction.wait().then((receipt) => {
                console.log("got receipt");
                console.log(receipt);
                getVotesForQuestion(question_id);
            })
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
                        <b> {name}</b> <br /> {"Current votes:"}{" "}
                        <img height="20" src="data:image/png;base64,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" />
                        <b style={{ color: "green" }}>{countVotes(state.getVotes[index][0])}</b>

                        <img height="20" src="data:image/jpeg;base64,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" />
                        <b style={{ color: "red" }}>{countVotes(state.getVotes[index][1])}</b>
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
