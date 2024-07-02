import * as crypto from 'crypto';
import keccak256 from 'keccak256';

// Function to hash the password using keccak256
function hashPassword(password: string): string {
    return `0x${keccak256(password).toString('hex')}`;
}

// Function to generate a random 32-byte value (for internal nullifier and identity secret)
function generateRandomValue(): string {
    return `0x${crypto.randomBytes(32).toString('hex')}`;
}

// Function to generate identity commitment
function generateIdentityCommitment(identitySecret: string): string {
    return `0x${keccak256(identitySecret).toString('hex')}`;
}

// Function to encrypt a value with the hashed password
function encryptValue(value: string, hashedPassword: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(hashedPassword.slice(2), 'hex'),
        iv,
    );

    const encrypted = Buffer.concat([
        cipher.update(Buffer.from(value.slice(2), 'hex')),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `0x${Buffer.concat([iv, encrypted, authTag]).toString('hex')}`;
}

// Function to decrypt a value (for future use)
function decryptValue(encryptedValue: string, hashedPassword: string): string {
    const encryptedBuffer = Buffer.from(encryptedValue.slice(2), 'hex');
    const iv = encryptedBuffer.slice(0, 12);
    const encrypted = encryptedBuffer.slice(12, -16);
    const authTag = encryptedBuffer.slice(-16);

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(hashedPassword.slice(2), 'hex'),
        iv,
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return `0x${decrypted.toString('hex')}`;
}

// Main function to set up user credentials
function setupUserCredentials(password: string) {
    const hashedPassword = hashPassword(password);
    const internalNullifier = generateRandomValue();
    const identitySecret = generateRandomValue();
    const identityCommitment = generateIdentityCommitment(identitySecret);

    const encryptedInternalNullifier = encryptValue(
        internalNullifier,
        hashedPassword,
    );
    const encryptedIdentitySecret = encryptValue(
        identitySecret,
        hashedPassword,
    );

    setAuthPassword(hashedPassword);

    return {
        hashedPassword,
        encryptedInternalNullifier,
        encryptedIdentitySecret,
        identityCommitment,
        internalNullifier,
    };
}

// Function to set the hashed password in the local storage
function setAuthPassword(hashedPassword: string) {
    localStorage.setItem('auth_password', hashedPassword);
}

export {
    setupUserCredentials,
    hashPassword,
    generateRandomValue,
    generateIdentityCommitment,
    encryptValue,
    decryptValue,
    setAuthPassword,
};
