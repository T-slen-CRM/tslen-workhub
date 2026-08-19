import * as CryptoJS from 'crypto-js';

const secretKey = 'H6sdmpNWjRRIqCc7rdxs01';

export function encryptMD5(password) {
    return CryptoJS.MD5(password).toString();
}
export function encrypt(password) {
    return CryptoJS.AES.encrypt(password, secretKey).toString();
}
export function decrypt(hash) {
    return CryptoJS.AES.decrypt(hash, secretKey).toString(CryptoJS.enc.Utf8);
}

