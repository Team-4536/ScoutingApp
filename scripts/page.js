"use strict";

import { dataObject, numInputs, onLoad, getElem, fillTeamData, fillDataObject, encodeData, decodeData, aStop, eStop, toggleSectionCollapse, reloadTeams } from "./utils.js";

async function decodeOnLoad() {
    let encodedURL = window.location.search;

    if (window.location.search[0] == '?') {
        encodedURL = encodedURL.slice(1);
    
        const urlData = JSON.parse(decodeURI(encodedURL)).data;
        const data = await decodeData(urlData);

        if (data) {
            fillTeamData(data);
            getElem('teams', 'id').value = data.team;
        } else {
            console.error('Could not fill team data due to invalid data');
        }
    }

    aStop();
    eStop();
}

// function createCSV(teamData) {
//     return teamData.map(obj => Object.values(obj).join(',')).join('\n');
// }

function generateQRCode() {
    encodeData().then((data) => {
        getElem('qrcode', 'id').innerHTML = '';
        let qrcodeDataObject = { 'ver': 1, 'data': data }

        new QRCode(getElem('qrcode', 'id'), {
            text: `https://team-4536.github.io/ScoutingApp/?${JSON.stringify(qrcodeDataObject)}`,
            correctLevel: QRCode.CorrectLevel.Q,
            width: 400,
            height: 400
        });
    });

    getElem('qrcode-container', 'id').style.display = 'block';
}

window.addEventListener('popstate', onLoad);

document.addEventListener('DOMContentLoaded', async function() {
    // for (let num of getElem(`${numInputs}:not(#team), textarea`, 'queryAll')) {
    //     let tr = num.closest('tr');
    //     let sec = tr.closest('table').dataset['sec'];
    //     let cat = tr.dataset['cat'];
    //     let con = num.getAttribute('con');

    //     teamData[sec][cat][con] = num.value;
    //     num.setAttribute('id', `${sec}-${cat}-${con}`);
    // }

    // reloadTeams();
    // decodeOnLoad();
    // toggleSectionCollapse('auto');

    const search = new URLSearchParams(window.location.search);
    const team = search.get('team');

    // if (team) {
    //     const teamData = dbClient.getTeam(team);

    //     if (await teamData) {
    //         fillTeamData(teamData);
    //     } else {
    //         dataObject = dataObject(team);
    //         dbClient.putTeam(dataObject);
    //         fillTeamData(JSON.parse(dataObject));
    //     }
    // }

    getElem('teams', 'id').addEventListener('change', function(event) {
        const team = event.target.value;

        if (team != '') {
            dbClient.getTeam(team).then(teamData => fillTeamData(teamData));
        } else {
            fillTeamData(JSON.parse(dataObject));
        }
    });

    getElem('.collapsible', 'queryAll').forEach(function(input) {
        input.addEventListener("click", function(event) {
            toggleSectionCollapse(event.target.id);
        });
    });

    getElem(`textarea, input`, 'queryAll').forEach(function(input) {
        input.addEventListener('change', function(event) {
            const teamData = fillDataObject()
            if (teamData.team.length > 2) {
                dbClient.putTeam(teamData);
                reloadTeams();
            }
        });
    });

    const beginScan = async () => {
        let popup = document.getElementById('scanner')
        popup.style.display = 'flex';

        let scanner = new Html5Qrcode("cameraStream", {
	    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
	    verbose: false
        });

        function callback(text, detail) {
            console.log('got scan', text, detail);
            scanner.pause(true);
        };

        function errorCallback(error) {
	    console.log('scanner error', error);
        };

        let framerate = 15;
        let cameras = await Html5Qrcode.getCameras()
        console.log(cameras);
        let camera = cameras[0].id;
        await scanner.start(camera, { fps: framerate, verbose: true },
                            callback, errorCallback);
        scanner.applyVideoConstraints({ frameRate: framerate });
    }

    const closeScanner = () => {
        getElem('scanner', 'id').style.display = 'none';
    }

    getElem('open-scanner', 'id').addEventListener('click', beginScan);

    getElem('close-scanner', 'id').addEventListener('click', closeScanner);

    getElem('a-stop', 'id').addEventListener('input', aStop);

    getElem('e-stop', 'id').addEventListener('input', eStop);

    getElem('open-qrcode', 'id').addEventListener('click', generateQRCode);

    document.getElementById('close-qrcode').addEventListener('click', function() {
        document.getElementById('qrcode-container').style.display = 'none';
    });

    document.querySelectorAll(numInputs).forEach(function (input) {
        input.placeholder = '0';
        input.type = 'number';
        input.min = '0';
    });

    getElem('team', 'id').placeholder = '0000';

    getElem('textarea', 'queryAll').forEach(function (textarea) {
        textarea.addEventListener('input', function () {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });
    });

    // document.querySelectorAll(numInputs).forEach(function (input) {
    //     input.addEventListener('input', function (event) {
    //         event.target.value = event.target.value.replace(/\D/g, '');
    //     });
    // });

    getElem('team', 'id').addEventListener('input', function (event) {
        const value = event.target.value;

        if (parseInt(value) == 0) {
            event.target.value = '';
        }

        if (parseInt(value) > 9999) {
            if (value != '10000') {
                event.target.value = event.target.value.slice(0, -1);
            } else {
                event.target.value = '9999';
            }
        }

        if (value.length < 4 && parseInt(value) != 0) {
            event.target.value = '0'.repeat(4 - value.length) + event.target.value;
        } else if (value.length > 4 && value[0] == '0') {
            event.target.value = value.slice(1);
        }
    });

    getElem(`${numInputs}:not(#team)`, 'queryAll').forEach(function (input) {
        input.addEventListener('input', function (event) {
            if (event.target.value[0] == '0') {
                event.target.value = event.target.value.slice(1);
            }

            if (parseInt(event.target.value) > 999) {
                event.target.value = '999';
            }
        });
    });
});
