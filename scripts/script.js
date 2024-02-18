"use strict";

const numInputs = 'input:not([type="text"], [type="checkbox"], #team)';
import { DBClient } from "../app-client.js";

import { stringify as csv_stringify } from "./csv-stringify.js";

const dbClient = new DBClient();
let currentTeam;

const dataObject = JSON.stringify({
    'comp': '',
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

const getElem = (value, type = 'id', head = document) => {
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

const saveTeam = async (data) => {
    console.log(validTeam(data ? data.team: undefined));
    if (validTeam(data ? data.team: undefined)) {
        if (data.comp && data.round) {
            await dbClient.putMatch(data);
        }
    }
    console.log('save done');
};

const pushState = (data, replace=false) => {
    const state = {
        team: data.team,
        comp: data.comp,
        round: data.round
    };
    const title = `MinuteBots Scouting - Team ${data.team} - Round ${data.round}`
    const url = `${location.origin}${location.pathname}?team=${data.team}&comp=${data.comp}&round=${data.round}`;

    if (replace) {
        history.replaceState(state, title, url);
    } else {
        history.pushState(state, title, url);
    }
};

const getTeam = () => {
    return currentTeam;
}

const refreshTeams = async () => {
    const teams = getElem('teams');
    const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null
    const comp = getElem('comp').value;
    const round = getElem('round').value;
    const teamNumbers = await dbClient.getMatchKeysForMatch(comp, round) || [];
    console.log('teams - refresh', teamNumbers);
    let newSelect = document.createElement('select');
    
    newSelect.addEventListener('change', switchTeam);

    newSelect.setAttribute('id', 'teams')
    {
        let selectOption = document.createElement('option')
        selectOption.value = 'select';
        selectOption.textContent = "Select team ...";
        newSelect.add(selectOption);

        let newOption = document.createElement('option')
        newOption.value = 'new';
        newOption.textContent = "New team ...";
        newSelect.add(newOption);
    }

    for (const team of teamNumbers) {
        let teamOption = document.createElement('option');
        teamOption.value = team;
        teamOption.textContent = team[0];
        if (team == selectedTeam) {
            teamOption.selected = true
        }
        newSelect.appendChild(teamOption);
    }

    teams.replaceWith(newSelect);
}

const onLoad = async () => {
    const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    for (let {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 0; j < 4; j++) {
                const th = document.createElement('th');
                let input;

                if (j === 0) {
                    th.innerHTML = cons[i];
                } else {
                    if (j === 3) {
                        input = document.createElement('select');
                        
                        th.appendChild(input);
                    } else {
                        const plus = document.createElement('button');
                        plus.className = "incr";
                        input = document.createElement('input');

                        plus.innerHTML = '+'

                        th.appendChild(input);
                        th.appendChild(plus);

                        plus.addEventListener('click', async () => {
                            input.value = (parseInt(input.value) || 0) + 1;
                            await saveTeam(scrapeDataObject());
                        });
                    }

                    const cat = catItems[j].className
                    const con = cons[i]

                    input.setAttribute('id', [table, cat, con].join('-'));
                }

                catItems[j].appendChild(th);
            }
        }
    }

    openSection('auto');
}

const popState = async () => {
    loadData();
}

const loadData = async () => {
    let url = window.location.search
    
    await refreshTeams();

    if (url) {
        const search = new URLSearchParams(url);
        url = url.slice(1);

        if (search.has('team')) {
            const team = search.get('team');
            const comp = search.get('comp');
            const round = search.get('round');
            let teamData = await dbClient.getMatch(comp, round, team);

            if (!teamData) {
                confirm('searched team ' + team + ' does not exist, and is invalid');
                teamData = emptyTeam();
                history.replaceState(null, null, location.origin + location.pathname);
            }

            console.log(teamData);
            await presentTeamData(teamData);
            openSection('auto');
        } else {
            const data = await decodeData(url);

            if (data) {
                presentTeamData(data);
                const team = data.team;
                
                if (team) {
                    pushState(data, true);
                    await saveTeam(data);
                    currentTeam = team;
                }
            } else {
                // Add visable error message
            }
        }
    } else {
        presentTeamData(emptyTeam());
    }

    refreshTeams();
}

const aStop = () => {
    getElem('a-reason').disabled = !getElem('a-stop').checked;
}

const eStop = () => {
    getElem('e-reason').disabled = !getElem('e-stop').checked;
}

const scrapeDataObject = () => {
    let teamData = emptyTeam();

    // mark
    let teams = getElem('teams')
    console.log(teams);
    console.log(teams.selectedIndex);
    if (teams.selectedIndex < 2) {
        return teamData
    }
    // not mark

    teamData.team = getTeam(); //teams.options[teams.selectedIndex].value
    //teamData.team = getElem('team').value;
    teamData.auto['left-zone'] = getElem('left-zone').checked;
    teamData.auto['a-stop'] = getElem('a-stop').checked;
    teamData.auto['a-reason'] = getElem('a-reason').value;
    teamData.teleop['e-stop'] = getElem('e-stop').checked;
    teamData.teleop['e-reason'] = getElem('e-reason').value;
    teamData.comp = getElem('comp').value;
    teamData.round = getElem('round').value;

    const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    for (let {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 1; j < 4; j++) {
                const cat = catItems[j].className
                const con = cons[i]
                
                teamData[table][cat][con] = getElem([table, cat, con].join('-')).value
            }
        }
    }
    
    console.log('scraped teamdata', teamData)
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

const presentTeamData = async(teamData, push=false) => {
    var con = ['succeeds', 'fails', 'method'];
    var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    console.log('teamdata', teamData)
    if (teamData) {
        // getElem('team').value = teamData.team || '';
        // getElem('teams').value = teamData.team || '';
        getElem('left-zone').checked = teamData.auto['left-zone'] || '';
        getElem('a-stop').checked = teamData.auto['a-stop'] || '';
        getElem('a-reason').value = teamData.auto['a-reason'] || '';
        getElem('e-stop').checked = teamData.teleop['e-stop'] || '';
        getElem('e-reason').value = teamData.teleop['e-reason'] || '';
        const comp = teamData.comp;
        if (comp) { getElem('comp').value = comp }
        const round = teamData.round;
        if (round) { getElem('round').value = round }
    
        for (let a = 0; a < 3; a++) {
            for (let b = 0; b < 3; b++) {
                try {
                    let value = teamData?.auto?.[con[a]]?.[cat[b]] || '';
                    getElem(`auto-${con[a]}-${cat[b]}`).value = value;
                } catch (error) {
                    console.error(`Error retrieving 'teamData.auto.${con[a]}.${cat[b]}': "${error}"`);
                }
            }
        }

        for (let c = 0; c < 3; c++) {
            for (let d = 0; d < 6; d++) {
                try {
                    let value = teamData?.teleop?.[con[c]]?.[cat[d]] || '';
                    getElem(`teleop-${con[c]}-${cat[d]}`).value = value;
                }
                catch (error) {
                    console.error(`Error retrieving 'teamData.teleop.${con[c]}.${cat[d]}': "${error}"`);
                }
            }
        }
        if (teamData.comp) {
            getElem('comp').value = teamData.comp;
        } else {
            getElem('comp').selectedIndex = 0;
        }
        if (teamData.round) {
            getElem('round').value = teamData.round;
        } else {
            getElem('round').selectedIndex = 0;
        }

        if (teamData.team) {
            const selected = `${teamData.team},${teamData.comp},${teamData.round}`;
            getElem('teams').value = selected;
        } else {
            getElem('teams').value = 'select';
        }
        currentTeam = teamData.team;
        if (push) {
            pushState(teamData);
        }
    }

    aStop();
    eStop();
}

/*
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
*/

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

const closeScanner = () => { getElem('scanner').style.display = 'none' }

const generateQRCode = () => {
    encodeData().then((data) => {
        getElem('qrcode').innerHTML = '';

        let qrcodeDataObject = { 'ver': 1, 'data': data }

        new QRCode(getElem('qrcode'), {
            text: `https://team-4536.github.io/ScoutingApp/?${JSON.stringify(qrcodeDataObject)}`,
            correctLevel: QRCode.CorrectLevel.Q,
            width: 400,
            height: 400
        });
    });

    getElem('qrcode-container').style.display = 'block';
}

const validTeam = (team) => {
    const teamNum = parseInt(team) ?? false;

    return team && teamNum && Number.isInteger(teamNum) && [3, 4].includes(team.length);
}

const switchMatch = (event) => {
    console.log("switchMatch");
    getElem('teams').value = "select";
    closeSections();
    refreshTeams();
};

const emptyTeam = () => {
    return JSON.parse(dataObject);
}

const clearTeam = () => {
    presentTeamData(emptyTeam());
};

const switchTeam = async (event) => {
    let select = event.target.value;

    if (select == 'select') {
        currentTeam = "";
        clearTeam();
        closeSections();
        return
    }
    if (select == 'new') {
        const newTeam = prompt('new team');
        // TODO validate team
        let teamData = emptyTeam();

        currentTeam = newTeam;

        teamData.team = currentTeam;
        teamData.comp = getElem('comp').value;
        teamData.round = getElem('round').value;

        await saveTeam(teamData);
        await refreshTeams();

        //pushState(teamData)

        presentTeamData(teamData, true);
    } else if (select != '') {
        console.log('splitting', select);
        let s = select.split(',');
        console.log('split', s);
        let [team, comp, round] = s;
        console.log('reading', comp, round, team);
        const teamData = await dbClient.getMatch(comp, round, team);
        console.log('got', teamData);
        currentTeam = team

        if (teamData) {
            presentTeamData(teamData, true);
        }
    }
    openSection('auto');
}

function closeSections(id) {
    const sections = getElem('collapsible', 'class')

    for (let s of sections) {
        s.classList.remove("active");
        s.classList.add("inactive");
        s.nextElementSibling.style.display = "none";
    }
}

function openSection(id) {
    const section = getElem(id);

    closeSections();

    if (currentTeam) {
        console.log("current team", currentTeam);
        section.classList.remove("inactive");
        section.classList.add("active");
        section.nextElementSibling.style.display = "block";
    }
}

const sync = async (event) => {
    const teamData = scrapeDataObject();

    if (teamData.team.length > 2) {
        await saveTeam(teamData);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('load', loadData);
    window.addEventListener('popstate', popState);

    console.log('DOM')
    console.log(document.readyState)

    onLoad();

    getElem('comp').addEventListener('change', switchMatch);
    getElem('round').addEventListener('change', switchMatch);
    getElem('teams').addEventListener('change', switchTeam);

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id));
    });

    getElem(`textarea, input`, 'queryAll').forEach((input) => {
        input.addEventListener('change', sync);
    });

    getElem('open-scanner').addEventListener('click', beginScan);

    getElem('close-scanner').addEventListener('click', closeScanner);

    getElem('a-stop').addEventListener('input', aStop);

    getElem('e-stop').addEventListener('input', eStop);

    getElem('open-qrcode').addEventListener('click', generateQRCode);

    getElem('textarea', 'queryAll').forEach( (textarea) =>
        textarea.addEventListener('input', resizeText(textarea))
    );

    getElem('close-qrcode').addEventListener('click', () =>
        getElem('qrcode-container').style.display = 'none'
    );

    getElem(numInputs, 'queryAll').forEach((input) =>
        input.addEventListener('input', formatNumber)
    );

    getElem(numInputs, 'queryAll').forEach( (input) => {
        input.placeholder = '0';
        input.type = 'number';
        input.min = '0';
    });

    getElem(`textarea, input`, 'queryAll').forEach((input) => {
        input.addEventListener('change', async () => {
            await saveTeam(scrapeDataObject());
            refreshTeams();
        });
    });
});

window.scrapeDataObject = scrapeDataObject;
