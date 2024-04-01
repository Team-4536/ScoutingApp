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

//License.LicenseManager.initLicense();

const cameraView = await DCE.CameraView.createInstance('/barcode-ui.html');
const cameraEnhancer = await DCE.CameraEnhancer.createInstance(cameraView);

console.log(cameraView);

let popup = document.getElementById('scanner')

popup.append(cameraView.getUIElement()); // Get default UI and append it to DOM.

const beginScan = async (id) => {
    popup.style.display = 'block';
    const router = await CVR.CaptureVisionRouter.createInstance();
    router.setInput(cameraEnhancer);
            console.log("router is", router);

    const resultReceiver = new CVR.CapturedResultReceiver();
    resultReceiver.onDecodedBarcodesReceived = (result) => {
        if (!result.barcodeResultItems.length) return;

        console.log(result);
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
    let popup = document.getElementById('scanner');
    popup.style.display = 'none';
}

export { beginScan, closeScanner }
