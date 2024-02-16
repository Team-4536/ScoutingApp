"use strict";

const numInputs = 'input:not([type="text"], [type="checkbox"], #team)';
import { DBClient } from "../app-client.js";

const dbClient = new DBClient();

const dataObject = JSON.stringify({
    'comp': 'Eagan week 0',
    'round': '',
    'team': '',

    'auto': {
        'left-zone': null,
        'a-stop': null,
        'a-reason': '',

        'succeeds': {},
        'fails': {},
        'method': {}
    },

    'teleop': {
        'e-stop': null,
        'e-reason': '',

        'succeeds': {},
        'fails': {},
        'method': {}
    }
});

const getElem = (value, type, head = document) => {
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

const saveTeam = (data) => validTeam(data.team) && dbClient.putTeam(data)

const push = (team) => history.pushState(null, null, location.origin + location.pathname + '?team=' + team);

const getTeam = () => {
    return currentTeam;
}

const refreshTeams = async () => {
    const teams = getElem('teams', 'id');
    const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null

    while (teams.options.length > 2) {
        teams.options.remove(2);
    }

    const teamNumbers = await dbClient.getAllTeamNumbers();
    console.log('teamNumbers: ' + teamNumbers);

    if (teamNumbers) {
        for (const team of teamNumbers) {
            let option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            if (team == selectedTeam) {
                option.selected = true
            }
            teams.appendChild(option);
        }
    }
}

const onLoad = async () => {
    let currentTeam = '';
    const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    for (let {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 0; j < 4; j++) {
                const th = document.createElement('th');

                if (j === 0) {
                    th.innerHTML = cons[i];
                } else {
                    if (j === 3) {
                        th.appendChild(document.createElement('select'));
                    } else {
                        const plus = document.createElement('button');
                        const input = document.createElement('input');

                        plus.innerHTML = '+'

                        th.appendChild(plus);
                        th.appendChild(input);
                        plus.addEventListener('click', () => {
                            input.value = (parseInt(input.value) || 0) + 1;
                            saveTeam(presentTeamData());
                        });
                    }

                    const cat = catItems[j].className
                    const con = cons[i]

                    th.id = [table, cat, con].join('-');
                }

                catItems[j].appendChild(th);
            }
        }
    }

    openSection('auto');

    let url = window.location.search
    
    if (url) {
        const search = new URLSearchParams(url);
        url = url.slice(1);

        if (search.has('team')) {
            const team = search.get('team');
            let teamData = await dbClient.getTeam(team);

            if (!teamData) {
                teamData = JSON.parse(dataObject);

                if (validTeam(team)) {
                    teamData.team = team;
                    saveTeam(teamData);
                    currentTeam = team;
                } else {
                    confirm('searched team ' + team + ' does not exist, and is invalid')
                }
            }

            presentTeamData(teamData);
        } else {
            const data = await decodeData(url);

            if (data) {
                presentTeamData(data);
                const team = data.team;
                
                if (team) {
                    push(team);
                    saveTeam(data);
                    currentTeam = team;
                }
            } else {
                // Add visable error message
            }
        }
    } else {
        presentTeamData(JSON.parse(dataObject));
    }
}

const aStop = () => {
    getElem('a-reason', 'id').disabled = !getElem('a-stop', 'id').checked;
}

const eStop = () => {
    getElem('e-reason', 'id').disabled = !getElem('e-stop', 'id').checked;
}

const scrapeDataObject = () => {
    var teamData = JSON.parse(dataObject);

    // mark
    let teams = getElem('teams', 'id')
    console.log(teams);
    console.log(teams.selectedIndex);
    if (teams.selectedIndex < 2) {
        return teamData
    }
    // not mark

    teamData.team = teams.options[teams.selectedIndex].value
    //teamData.team = getElem('team', 'id').value;
    teamData.auto['left-zone'] = getElem('left-zone', 'id').checked;
    teamData.auto['a-stop'] = getElem('a-stop', 'id').checked;
    teamData.auto['a-reason'] = getElem('a-reason', 'id').value;
    teamData.teleop['e-stop'] = getElem('e-stop', 'id').checked;
    teamData.teleop['e-reason'] = getElem('e-reason', 'id').value;

    const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    for (let {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 1; j < 4; j++) {
                const cat = catItems[j].className
                const con = cons[i]
                
                teamData[table][cat][con] = getElem([table, cat, con].join('-'), 'id').value
            }
        }
    }
    
    return teamData;
}

const decodeData = async encodedData => {
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

const encodeData = async data => {
    const stream = new Blob([JSON.stringify(data)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedReadableStream).blob();
    const ab = await blob.arrayBuffer();

    return btoa(String.fromCharCode(...new Uint8Array(ab)));
}

const presentTeamData = (teamData) => {
    var con = ['succeeds', 'fails', 'method'];
    var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    if (teamData) {
        // getElem('team', 'id').value = teamData.team || '';
        getElem('teams', 'id').value = teamData.team || '';
        getElem('left-zone', 'id').checked = teamData.auto['left-zone'] || '';
        getElem('a-stop', 'id').checked = teamData.auto['a-stop'] || '';
        getElem('a-reason', 'id').value = teamData.auto['a-reason'] || '';
        getElem('e-stop', 'id').checked = teamData.teleop['e-stop'] || '';
        getElem('e-reason', 'id').value = teamData.teleop['e-reason'] || '';
    
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
    }

    refreshTeams();
    aStop();
    eStop();
}

const formatTeam = event => {
    const value = event.target.value;

    if (parseInt(value) == 0) {
        event.target.value = '';
    }

    if (parseInt(value) > 9999) {
        if (value != '10000') {
            event.target.value = value.slice(0, -1);
        } else {
            event.target.value = '9999';
        }
    }

    if (value.length < 4 && parseInt(value) != 0) {
        event.target.value = '0'.repeat(4 - value.length) + value;
    } else if (value.length > 4 && value[0] == '0') {
        event.target.value = value.slice(1);
    }
}

const formatNumber = event => {
    if (event.target.value[0] == '0') {
        event.target.value = event.target.value.slice(1);
    }

    if (parseInt(event.target.value) > 999) {
        event.target.value = '999';
    }
}

const resizeText = textarea => {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
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

    const callback = (text, detail) => {
        console.log('got scan', text, detail);
        scanner.pause(true);
    };

    const errorCallback = (error) => {
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

const closeScanner = () => { getElem('scanner', 'id').style.display = 'none' }

const generateQRCode = () => {
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

const validTeam = (team) => {
    if ([3, 4].includes(team.length) && Number.isInteger(parseInt(team))) {
        return true;
    } else {
        return false;
    }
}

const switchTeam = async event => {
    let team = event.target.value;

    if (team == 'new') {
        team = prompt('new team');
        let teamData = JSON.parse(dataObject);
        teamData.team = team;
        saveTeam(teamData);
        refreshTeams();
        presentTeamData(teamData);
    }

    if (team === '') {
        presentTeamData(JSON.parse(dataObject));
    } else {
        const teamData = await dbClient.getTeam(team);

        if (teamData) {
            presentTeamData(teamData);
            push(team);
            saveTeam(teamData);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onLoad();

    getElem('teams', 'id').addEventListener('change', async event => switchTeam(event));

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener("click", (event) => {
            openSection(event.target.id);
        });
    });

    getElem(`textarea, input`, 'queryAll').forEach((input) => {
        input.addEventListener('change', () => {
            const teamData = scrapeDataObject()

            if (teamData.team.length > 2) {
                saveTeam(teamData);
                refreshTeams();
            }
        });
    });

    getElem('open-scanner', 'id').addEventListener('click', beginScan);

    getElem('close-scanner', 'id').addEventListener('click', closeScanner);

    getElem('a-stop', 'id').addEventListener('input', aStop);

    getElem('e-stop', 'id').addEventListener('input', eStop);

    getElem('open-qrcode', 'id').addEventListener('click', generateQRCode);

    getElem('textarea', 'queryAll').forEach( (textarea) =>
        textarea.addEventListener('input', resizeText(textarea))
    );

    getElem('close-qrcode', 'id').addEventListener('click', () =>
        getElem('qrcode-container', 'id').style.display = 'none'
    );

    getElem(numInputs, 'queryAll').forEach((input) =>
        input.addEventListener('input', (event) => formatNumber(event))
    );

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id));
    });

    getElem(numInputs, 'queryAll').forEach( (input) => {
        input.placeholder = '0';
        input.type = 'number';
        input.min = '0';
    });

    getElem(`textarea, input`, 'queryAll').forEach((input) => {
        input.addEventListener('change', () => {
            saveTeam(scrapeDataObject());
            refreshTeams();
        });
    });

    // document.querySelectorAll(numInputs).forEach(function (input) {
    //     input.addEventListener('input', function (event) {
    //         event.target.value = event.target.value.replace(/\D/g, '');
    //     });
    // });
});

function openSection(id) {
    const section = getElem(id, 'id');

    const sections = getElem('collapsible', 'class')

    for (let s of sections) {
        s.classList.remove("active");
        s.classList.add("inactive");
        s.nextElementSibling.style.display = "none";
    }
    section.classList.remove("inactive");
    section.classList.add("active");
    section.nextElementSibling.style.display = "block";
}

window.scrapeDataObject = scrapeDataObject
