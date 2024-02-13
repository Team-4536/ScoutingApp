"use strict";

const numInputs = 'input:not([type="text"], [type="checkbox"])';

const dataObject = JSON.stringify({
    'team': '',
    'auto': {
        'left-zone': null,
        'a-stop': null,
        'a-reason': '',
        'succeed': {},
        'fail': {},
        'method': {}
    },
    'teleop': {
        'e-stop': null,
        'e-reason': '',
        'succeed': {},
        'fail': {},
        'method': {}
    }
});

function getElem(value, type, head = document) {
    const typeMap = {
        id: head.getElementById,
        name: head.getElementsByName,
        class: head.getElementsByClassName,
        queryAll: head.querySelectorAll,
        query: head.querySelector,
        tag: head.getElementsByTagName,
    };

    if (!(type in typeMap)) {
        console.warn(`Unrecognized element type: ${type}`);
        return undefined;
    }

    const result = typeMap[type].call(head, value);

    if (!result) {
        console.error(`Element with type '${type}' of '${value}' was not found`);
    }

    return result;
}

const push = (team) => { history.pushState(null, null, location.origin + location.pathname + '?team=' + team) }

async function refreshTeams() {
    const teams = getElem('teams', 'id');

    getElem('option:not(:first-child)', 'queryAll', teams).forEach(option => option.remove());

    const teamNumbers = await dbClient.getAllTeamNumbers();

    if (teamNumbers) {
        for (let team of teamNumbers) {
            let option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teams.appendChild(option);
        }
    }

    getElem('teams', 'id').value = getElem('team', 'id');
}

async function onLoad() {
    toggleSectionCollapse('auto');
    fillDataObject();

    let url = window.location.search
    
    if (url) {
        const search = new URLSearchParams(url);
        url = url.slice(1);

        if (search.has('team')) {
            const team = search.get('team');
            let teamData = await dbClient.getTeam(team);

            if (!teamData) {
                teamData = JSON.parse(dataObject);
                teamData.team = team; // ADD CHECK FOR IF VALID TEAM
                dbClient.putTeam(teamData);
            }

            fillTeamData(teamData);
        } else {
            const data = await decodeData(url);

            if (data) {
                fillTeamData(data);
                const team = data.team;
                
                if (team) {
                    push(team);
                    dbClient.putTeam(data);
                }
            } else {
                // Add visable error message
            }
        }
    } else {
        fillTeamData(JSON.parse(dataObject));
    }
}

function aStop() {
    getElem('a-reason', 'id').disabled = !getElem('a-stop', 'id').checked;
}

function eStop() {
    getElem('e-reason', 'id').disabled = !getElem('e-stop', 'id').checked;
}

function toggleSectionCollapse(id) {
    const section = getElem(id, 'id');

    section.classList.toggle("active");
    let content = section.nextElementSibling;

    if (content.style.display === "block") {
        content.style.display = "none";
    } else {
        content.style.display = "block";
    }
}

function fillDataObject() {
    var teamData = JSON.parse(dataObject);

    teamData.team = getElem('team', 'id').value;
    teamData.auto['left-zone'] = getElem('left-zone', 'id').checked;
    teamData.auto['a-stop'] = getElem('a-stop', 'id').checked;
    teamData.auto['a-reason'] = getElem('a-reason', 'id').value;
    teamData.teleop['e-stop'] = getElem('e-stop', 'id').checked;
    teamData.teleop['e-reason'] = getElem('e-reason', 'id').value;

    for (let num of getElem(`${numInputs}:not(#team), textarea`, 'queryAll')) {
        let tr = num.closest('tr');
        let sec = tr.closest('table').dataset['sec'];
        let cat = tr.dataset['cat'];
        let con = num.getAttribute('con');

        teamData[sec][cat][con] = num.value;
        num.setAttribute('id', `${sec}-${cat}-${con}`);
    }
    
    return teamData;
}

async function decodeData(encodedData) {
    try {
        const data = JSON.parse(decodeURI(encodedData));
        const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
        let blob = new Blob([bytes]);
        const decoder = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        blob = await new Response(decoder).blob();
        const text = await blob.text();
        return JSON.parse(text);
    } catch (error) {
        console.error(`Error decoding data due to invalid data: "${error.message}"`);
        return undefined
    }
}

async function encodeData(data) {
    const teamData = fillDataObject();
    const stream = new Blob([JSON.stringify(teamData)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedReadableStream).blob();

    const ab = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(ab)));
}

function fillTeamData(teamData) {
    var con = ['succeed', 'fail', 'method'];
    var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    if (teamData) {
        getElem('team', 'id').value = teamData.team || '';
        getElem('left-zone', 'id').checked = teamData.auto['left-zone'] || '';
        getElem('a-stop', 'id').checked = teamData.auto['a-stop'] || '';
        getElem('a-reason', 'id').value = teamData.auto['a-reason'] || '';
        getElem('e-stop', 'id').checked = teamData.teleop['e-stop'] || '';
        getElem('e-reason', 'id').value = teamData.teleop['e-reason'] || '';
    }
    
    for (let a = 0; a < 3; a++) {
        for (let b = 0; b < 3; b++) {
            try {
                getElem(`auto-${con[a]}-${cat[b]}`, 'id').value = teamData.auto[con[a]][cat[b]] || '';
            } catch (error) {
                console.error(`Error retrieving 'teamData.auto.${con[a]}.${cat[b]}': "${error}"`);
            }
        }
    }

    for (let c = 0; c < 3; c++) {
        for (let d = 0; d < 6; d++) {
            try {
                getElem(`teleop-${con[c]}-${cat[d]}`, 'id').value = teamData.teleop[con[c]][cat[d]] || '';
            }
            catch (error) {
                console.error(`Error retrieving 'teamData.teleop.${con[c]}.${cat[d]}': "${error}"`);
            }
        }
    }

    refreshTeams();
    getElem('teams', 'id').value = teamData.team || '';
    aStop();
    eStop();
}

const formatTeam = (event) => {
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
}

async function decodeOnLoad() {
    let encodedURL = window.location.search;

    if (window.location.search[0] == '?') {
        encodedURL = encodedURL.slice(1);
    
        const urlData = JSON.parse(decodeURI(encodedURL)).data;
        const data = await decodeData(urlData);

        if (data) {
            fillTeamData(data);
            // getElem('teams', 'id').value = data.team;
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

window.addEventListener('popstate', async function() {
    // onLoad();
    console.log('popstate called');
});

document.addEventListener('DOMContentLoaded', async function() {
    onLoad();

    const search = new URLSearchParams(window.location.search);
    const team = search.get('team');

    getElem('teams', 'id').addEventListener('change', function(event) {
        const team = event.target.value;

        if (team != '') {
            dbClient.getTeam(team).then(teamData => {
                fillTeamData(teamData);
                push(teamData.team);
            });
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
                refreshTeams();
            }
        });
    });

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

    getElem('team', 'id').addEventListener('input', formatTeam);

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
