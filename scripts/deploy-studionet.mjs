import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const ENV_PATH = resolve(".env.studionet.local");
const FRONTEND_PATH = resolve("frontend", "app.js");
const README_PATH = resolve("README.md");
const PRIVATE_KEY_RE = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function loadLocalEnv() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator < 1) continue;
    const key = value.slice(0, separator).trim();
    const content = value.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = content;
  }
}

function deployedAddress(receipt) {
  const candidates = [
    receipt?.data?.contract_address,
    receipt?.data?.contractAddress,
    receipt?.txDataDecoded?.contractAddress,
    receipt?.contractAddress,
    receipt?.contract_address,
    receipt?.recipient,
  ];
  return candidates.find((value) => ADDRESS_RE.test(value || ""));
}

function replaceRequired(source, pattern, replacement, label) {
  const updated = source.replace(pattern, replacement);
  if (updated === source) throw new Error(`Could not update ${label}.`);
  return updated;
}

function repointProject(address, hash, deployer) {
  const frontend = replaceRequired(
    readFileSync(FRONTEND_PATH, "utf8"),
    /contractAddress:\s*"0x[0-9a-fA-F]{40}"/,
    `contractAddress: "${address}"`,
    "frontend contract address",
  );
  writeFileSync(FRONTEND_PATH, frontend);

  let readme = readFileSync(README_PATH, "utf8");
  readme = replaceRequired(
    readme,
    /\[Studionet contract\]\([^)]+\) \| \[Deployment transaction\]\([^)]+\)/,
    `[Studionet contract](https://explorer-studio.genlayer.com/address/${address}) | [Deployment transaction](https://explorer-studio.genlayer.com/tx/${hash})`,
    "README deployment links",
  );
  readme = replaceRequired(
    readme,
    /\| Contract \| `0x[0-9a-fA-F]{40}` \|/,
    `| Contract | \`${address}\` |`,
    "README contract address",
  );
  readme = replaceRequired(
    readme,
    /\| Deployer \| `0x[0-9a-fA-F]{40}` \|/,
    `| Deployer | \`${deployer}\` |`,
    "README deployer address",
  );
  writeFileSync(README_PATH, readme);
}

loadLocalEnv();
const privateKey = (process.env.STUDIONET_PRIVATE_KEY || "").trim();
if (!PRIVATE_KEY_RE.test(privateKey)) {
  throw new Error("Put STUDIONET_PRIVATE_KEY=0x... in ignored .env.studionet.local before deployment.");
}

const account = createAccount(privateKey);
const client = createClient({ chain: studionet, account });
const code = new Uint8Array(readFileSync(resolve("genopoly.py")));

console.log(`Deploying Genopoly v2.3 to Studionet from ${account.address}`);
const hash = await client.deployContract({ code, args: [] });
console.log(`Deployment transaction: ${hash}`);
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.FINALIZED,
  interval: 5000,
  retries: 240,
});
const address = deployedAddress(receipt);
if (!address) {
  writeFileSync("deployment.failed.receipt.json", JSON.stringify(receipt, null, 2));
  throw new Error("Deployment finalized but no contract address was decoded.");
}

const deployment = {
  project: "Genopoly",
  contractVersion: "2.3.0",
  network: "studionet",
  chainId: 61999,
  rpc: "https://studio.genlayer.com/api",
  explorer: "https://explorer-studio.genlayer.com",
  contractAddress: address,
  contractExplorer: `https://explorer-studio.genlayer.com/address/${address}`,
  deployTxHash: hash,
  deployTxExplorer: `https://explorer-studio.genlayer.com/tx/${hash}`,
  deployer: account.address,
  deployedAt: new Date().toISOString(),
  status: "FINALIZED",
  funding: {
    address: account.address,
    status: "funded before deployment",
    source: "GenLayer Studionet built-in faucet",
  },
  smoke: {},
};

writeFileSync("deployment.json", `${JSON.stringify(deployment, null, 2)}\n`);
repointProject(address, hash, account.address);
console.log(`Genopoly contract: ${address}`);
console.log(deployment.contractExplorer);
console.log("Updated frontend/app.js and README.md to the new deployment.");
