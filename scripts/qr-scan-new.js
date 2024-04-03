import * as Core from "dynamsoft-core";
import * as License from "dynamsoft-license";
import * as DCE from "dynamsoft-camera-enhancer";
import * as DBR from "dynamsoft-barcode-reader";
import * as CVR from "dynamsoft-capture-vision-router";
import * as Utility from "dynamsoft-utility";

Object.assign(Core.CoreModule.engineResourcePaths, {
    std: "/assets/scan/",
    dip: "/assets/scan/",
    core: "/assets/scan/",
    license: "/assets/scan/",
    cvr: "/assets/scan/",
    dbr: "/assets/scan/",
    dce: "/assets/scan/",
    utility: "/assets/scan/"
})

const licenseEncrypted = new Uint8Array([
    16,12,219,45,110,161,53,182,210,149,24,16,77,134,7,189,113,207,22,148,86,111,47,201,
    70,233,153,184,54,165,146,209,188,25,1,53,53,24,32,94,75,250,106,104,224,135,72,83,78,
    210,79,69,166,206,144,114,161,148,53,3,120,0,106,24,115,40,161,41,44,6,122,144,42,71,
    150,25,243,61,71,101,160,109,35,104,235,185,113,88,237,120,228,74,153,151,181,140,23,
    90,85,94,216,158,73,78,234,130,3,252,159,4,105,113,248,202,19,132,211,31,95,18,30,
    116,198,195,193,255,127,239,70,184,138,47,190,92,3,249,60,235,124,24,34,63,39,77,
    6,169,100,146,215,196,225,245,130,245,92,181,244,53,244,154,86,240,145,65,191,252,
    25,110,15,128,59,87,110,150,243,130,1,135,59,28,235,35,221,64,185,16,112,69,158,248,
    198,46,57,201,120,159,96,195,97,116,37,89,236,200,170,220,232,10,251,40,248,184,80,
    53,20,202,187,74,175,238,160,85,196,116,19,41,19,122,34,181,84,133,202,72,204,237,
    105,104,151,210,144,76,242,73,15,88,237,159,52,38,143,112,178,116,214,137,237,55,49,
    173,206,193,106,179,56,211,63,13,17,6,250,238,210,162,139,47,143,149,80,168,97,198,
    194,146,232,123,251,49,232,140,34,24,227,93,198,97,115,47]);

function getPW() {
    let password = prompt("Scanner password");
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

async function decryptLicense() {
    let buffer = licenseEncrypted;
    let lenS = buffer[0];
    let lenIV = buffer[1]
    let s = buffer.slice(2, lenS+2);
    let iv = buffer.slice(lenS+2, lenS+2+lenIV)
    let keyMaterial = await getPW();
    let key = await getKey(keyMaterial, s);

    let ciphertext = buffer.slice(lenS+2+lenIV);

    let decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        ciphertext
    );

    return (new TextDecoder()).decode(decrypted);
};

const license = async () => {
    const ls = window.localStorage;

    let key = ls.getItem("scan-license");

    do {
        if (!key) {
            key = await decryptLicense();
            if (!key) {
                return false;
            }
        }
        try {
            await License.LicenseManager.initLicense(key);
        } catch (e) {
            alert("invalid key");
            key = null;
        }
    } while (!key);
    ls.setItem("scan-license", key);
    return true;
}

var cameraView;
var cameraEnhancer;

var licensed = false;

const beginScan = async (callback) => {
    if (!licensed) {
        licensed = await license();
    }
    if (!licensed) {
        return;
    }

    let popup = document.getElementById('scanner')
    if (!cameraView) {
        cameraView = await DCE.CameraView.createInstance('/barcode-ui.html');
        cameraEnhancer = await DCE.CameraEnhancer.createInstance(cameraView);

        let stream = document.getElementById('cameraStream');
        stream.append(cameraView.getUIElement()); // Get default UI and append it to DOM.
    }

    popup.style.display = 'flex';
    const router = await CVR.CaptureVisionRouter.createInstance();
    router.setInput(cameraEnhancer);
    console.log("router is", router);

    const resultReceiver = new CVR.CapturedResultReceiver();
    resultReceiver.onDecodedBarcodesReceived = (result) => {
        if (!result.barcodeResultItems.length) return;

        console.log("got qr", result);
        callback(new URL(result.barcodeResultItems[0].text));
    };
    router.addResultReceiver(resultReceiver);

    // Filter out unchecked and duplicate results.
    const filter = new Utility.MultiFrameResultCrossFilter();
    filter.enableResultCrossVerification(
        Core.EnumCapturedResultItemType.CRIT_BARCODE,
        true
    ); // Filter out unchecked barcodes.
    // Filter out duplicate barcodes within 3 seconds.
    filter.enableResultDeduplication(
        Core.EnumCapturedResultItemType.CRIT_BARCODE,
        true
    );
    filter.setDuplicateForgetTime(
        Core.EnumCapturedResultItemType.CRIT_BARCODE,
        3000
    );
    await router.addResultFilter(filter);

    await cameraEnhancer.open();
    try {
        await router.startCapturing("ReadSingleBarcode");
    } catch (e) {
        console.log("e is ", e);
    }
}

const closeScanner = () => {
    try {
        cameraEnhancer.close();
    } catch (e) {
    }
    let popup = document.getElementById('scanner');
    popup.style.display = 'none';
}

export { beginScan, closeScanner }
