async function getPlaintext() {
    let message = await ask("Enter the plaintext: ");
    let enc = new TextEncoder();
    return enc.encode(message);
}

async function getKeyMaterial() {
    let password = await ask("Enter password: ");
    let enc = new TextEncoder();
    return crypto.subtle.importKey(
        "raw", 
        enc.encode(password), 
        {name: "PBKDF2"}, 
        false, 
        ["deriveBits", "deriveKey"]
    );
}

function getKey(keyMaterial, salt) {
    return crypto.subtle.deriveKey(
        {
            "name": "PBKDF2",
            salt: salt, 
            "iterations": 100000,
            "hash": "SHA-256"
        },
        keyMaterial,
        { "name": "AES-GCM", "length": 256},
        true,
        [ "encrypt", "decrypt" ]
    );
}

async function encrypt() {
    let keyMaterial = await getKeyMaterial();
    salt = crypto.getRandomValues(new Uint8Array(16));
    let key = await getKey(keyMaterial, salt);
    iv = crypto.getRandomValues(new Uint8Array(12));
    let encoded = await getPlaintext();

    let lens = new Uint8Array(2);
    lens[0] = salt.length
    lens[1] = iv.length

    let header = new Uint8Array([...lens, ...salt, ...iv]);

    ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoded
    );

    let buffer = new Uint8Array([...header,...(new Uint8Array(ciphertext))]);
    console.log(`[${buffer.toString()}]`);
}

async function decrypt(buffer) {
    console.log('decrypt', buffer);

    let lenS = buffer[0];
    let lenIV = buffer[1]
    let s = buffer.slice(2, lenS+2);
    console.log(s);
    let iv = buffer.slice(lenS+2, lenS+2+lenIV)
    console.log(iv);
    let keyMaterial = await getKeyMaterial();
    let key = await getKey(keyMaterial, s);

    let ciphertext = buffer.slice(lenS+2+lenIV);
    console.log('ciphertext', ciphertext);
    
    let decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        ciphertext
    );

    console.log('decrypted: ', (new TextDecoder()).decode(decrypted));
};

let rl = require('readline');

let rlif = rl.createInterface({input: process.stdin, output: process.stderr});

const ask = (prompt) => new Promise((t,r) => {
    rlif.question(prompt, answer => t(answer));
});

encrypt().then(() => process.exit(0));;
