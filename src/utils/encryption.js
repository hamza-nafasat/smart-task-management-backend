import jose from "node-jose";
import getenv from "../config/dotenv.js";

// Function to encrypt the payload
const encryptPayload = async (payload) => {
    try {
        const keyStore = jose.JWK.createKeyStore();
        const publicKey = await keyStore.add(getenv("PUBLIC_KEY_FOR_ENCRYPTION"), "pem");
        const encrypted = await jose.JWE.createEncrypt({ format: "compact" }, publicKey)
            .update(JSON.stringify(payload))
            .final();
        return encrypted;
    } catch (error) {
        console.error(`Error encrypting payload: ${error.message}`);
        throw error;
    }
};

// Function to decrypt the payload
const decryptPayload = async (encrypted) => {
    try {
        const keyStore = jose.JWK.createKeyStore();
        const privateKey = await keyStore.add(getenv("PRIVATE_KEY_FOR_ENCRYPTION"), "pem");
        const result = await jose.JWE.createDecrypt(privateKey).decrypt(encrypted);
        return JSON.parse(result.payload.toString());
    } catch (error) {
        console.error(`Error decrypting payload: ${error.message}`);
        throw error;
    }
};

// function for generate public and private keys
const generateKeys = async () => {
    try {
        const keyStore = jose.JWK.createKeyStore();
        const key = await keyStore.generate("RSA", 2048, { alg: "RSA-OAEP-256", use: "enc" });
        const publicKey = key.toPEM(false);
        const privateKey = key.toPEM(true);
        console.log("public key is ", publicKey);
        console.log("private key is ", privateKey);
        console.log("Keys generated and saved to files.");
    } catch (error) {
        console.error(`Error generating keys: ${error.message}`);
    }
};

export { encryptPayload, decryptPayload };
