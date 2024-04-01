const beginScan = async (id) => {
    let popup = document.getElementById('scanner')
    popup.style.display = 'flex';
    let cameras = await Html5Qrcode.getCameras()
    const camerasscanner = getElem('cameras')
    const options = getElem('option', 'queryAll', camerasscanner)
    options.forEach((opt) => {
        opt.remove()
    })
    cameras.forEach((cam) => {
        const camera = document.createElement('option')
        camera.textContent = cam.label
        camera.value = cam.id
        camera.selected = cam.id === id
        camerasscanner.appendChild(camera)
    })

    let scanner = new Html5Qrcode('cameraStream', {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
    });

    popup.scanner = scanner;

    const callback = async (text, detail) => {
        let url;
        try {
            url = new URL(text);
        } catch (e) {
            console.log("creating url from qr code", e);
        }
        if (!["http:", "https:"].includes(url.protocol) || !url.searchParams.has("data")) {
            console.log("bad qr code url", url);
            return;
        }
        console.log("Scanned URL", url);
        let data;
        try {
            data = JSON.parse(url.searchParams.get("data"));
            console.log("qr code parsed data =", data);
        } catch (e) {
            console.log("error parsing qr code json", e);
        }
        const dataObject = await decodeData(data.data)
        /*
          TODO:
        saveMatch(dataObject).catch((e) => console.log("decoding", e))
        pushState(dataObject)
        presentTeamData(dataObject)
        */
        closeScanner()
        console.log('scanned data', dataObject)
    };

    const errorCallback = (error) => {
        // console.log('scanner error', error);
    };

    let framerate = 15;
    console.log(cameras);
    
    if (id) {
        await scanner.start(id , { fps: framerate, verbose: true },
                        callback, errorCallback);
    } else {
        await scanner.start({ facingMode: 'environment' }, { fps: framerate, verbose: true },
                            callback, errorCallback);
    }

    scanner.applyVideoConstraints({ frameRate: framerate });
}

const closeScanner = () => {
    let popup = document.getElementById('scanner');
    popup.style.display = 'none';
    popup.scanner && popup.scanner.stop();
    popup.scanner = null;
}

export { beginScan, closeScanner }
