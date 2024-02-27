'use strict';

import { DBClient } from '../app-client.js';
import { stringify } from "./csv-stringify.js";

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
    },

    'scoring': {
        'collisions' : null,
        'climb': null,

        'coop': null,
        'melody': null,
        'ensemble': null,
        'win': null,
        'tie': null,

        'score': '',

        'amp': {},

        'spkr': {}
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
        console.warn('Unrecognized element type: ' + type);
        return undefined;
    }

    const result = typeMap[type].call(head, value);

    if (!result) {
        console.error('Element with type \'' + type + '\' of \'' + value +  '\' was not found');
    }

    return result;
}

const saveMatch = async (data) => {    
    if (validTeam(data ? data.team: undefined) && data.comp && data.round) {
        await dbClient.putMatch(data);
    }
};

const pushState = (data, replace=false) => {
    console.log('push data', data)
    console.log('replace', replace)

    const state = {
        team: data.team,
        comp: data.comp,
        round: data.round
    };
    
    const title = `MinuteBots Scouting - Team ${data.team} - Round ${data.round}`;
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

const getMatch = () => {
    return [getTeam(), getElem('comp').value, getElem('round').value].join(',');
}

const refreshTeams = async () => {
    const teams = getElem('teams');
    const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null
    const comp = getElem('comp').value;
    const round = getElem('round').value;
    const teamNumbers = await dbClient.getMatchKeys(comp, round) || [];
    let newSelect = document.createElement('select');
    
    newSelect.addEventListener('change', switchTeam);

    newSelect.setAttribute('id', 'teams')
    {
        let selectOption = document.createElement('option');
        selectOption.value = 'select';
        selectOption.textContent = "Select team ...";
        newSelect.add(selectOption);

        let newOption = document.createElement('option');
        newOption.value = 'new';
        newOption.textContent = "New team ...";
        newSelect.add(newOption);
    }

    for (const team of teamNumbers) {
        let teamOption = document.createElement('option');
        teamOption.value = team;
        teamOption.textContent = team[0];
        if (team === selectedTeam) {
            teamOption.selected = true;
        }
        newSelect.appendChild(teamOption);
    }

    teams.replaceWith(newSelect);
    teams.value = getMatch();
}

const method = (event) => {
    if (event.target.value === 'add') {
        confirm('what method?');
    }
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
                    th.textContent = cons[i];
                } else {
                    if (j === 3) {
                        const options = [['a', 'a'], ['b', 'a'], ['c', 'c'], ['d', 'd'], ['Add method', 'add']];

                        input = document.createElement('select');
                        input.classList.add('input');
                        
                        options.forEach((option) => {
                            const method = document.createElement('option');
                            
                            method.textContent = option[0];
                            method.value = option[1];

                            input.appendChild(method);
                        });

                        input.addEventListener('change', (event) => method(event));
                                                
                        th.appendChild(input);
                    } else {
                        const plus = document.createElement('button');
                        input = document.createElement('input');
                        input.classList.add('number', 'input');

                        plus.textContent = '+';
                        plus.classList.add('incr');

                        plus.addEventListener('click', async () => {
                            input.value = (parseInt(input.value) || 0) + 1;

                            await sync();
                        });

                        th.appendChild(plus);
                        th.appendChild(input);
                    }

                    const cat = catItems[j].className;
                    const con = cons[i];

                    input.setAttribute('id', [table, cat, con].join('-'));
                    input.classList.add('table-input');
                }

                catItems[j].appendChild(th);
            }
        }
    }
}

const popState = async () => {
    loadData();

    console.log('popState called')
}

const loadData = async () => {
    let url = window.location.search;
    let teamData = emptyTeam();
    let push = false;
    
    console.log('url', location.origin + location.pathname + url)

    const search = new URLSearchParams(url);

    if (search.has('data')) { // if URL has data param
        const dataParam = search.get('data');

        console.log('has data param', dataParam);

        const data = await decodeData(JSON.stringify({data: dataParam}));

        if (data) { // if data param could be decoded
            console.log('decoded data', data);

            teamData = data;

            push = true;
        } else { // if data param could not be decoded
            console.error('unable to decode data from URL');
        }

    } else if (search.has('comp') && search.has('round')) { // if URL has comp and round param
        const compParam = search.get('comp');
        const roundParam = search.get('round');

        teamData.comp = compParam;
        teamData.round = roundParam;

        if (search.has('team')) { // if URL has team param
            const teamParam = search.get('team');

            console.log('has team, comp, and round params', 'team=' + teamParam + ', comp=' + compParam + ', round=' + roundParam);

            teamData.team = teamParam;

            const match = await dbClient.getMatch(compParam, roundParam, teamParam);

            if (match) { // if match exists
                console.log('match exists', match);

                teamData = match;
            } else { // if match does not exist
                console.log('match does not exist', teamParam, compParam, roundParam);
            }

        } else { // if URL does not have team param
            console.log('has comp and round params', 'comp=' + compParam + ', round=' + roundParam);
        }
    }

    console.log('data presented on load', teamData)

    presentTeamData(teamData, push);
    refreshTeams();

    const sec = localStorage.getItem('sec');

    if (sec) {
        openSection(sec);
    } else {
        openSection('auto');
    }
}

const aStop = () => {
    getElem('a-reason').disabled = !getElem('a-stop').checked;
}

const eStop = () => {
    getElem('e-reason').disabled = !getElem('e-stop').checked;
}

const presentTeamData = async (teamData, push=false) => {
    console.log('tem dataa', teamData)
    if (teamData) {
        const comp = getElem('comp');
        const round = getElem('round');

        console.log('team', teamData.team)
        currentTeam = teamData.team || '';
        comp.value = teamData.comp || comp[0].value;
        round.value = teamData.round || round[0].value;

        const secs = ['auto', 'teleop', 'scoring'];

        for (const sec of secs) {
            getElem('.input', 'queryAll', getElem(sec).nextElementSibling).forEach((input) => {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0])) { // auto or teleop table element
                    input.value = teamData[id[0]][id[1]][id[2]] ?? '';
                } else if (['amp', 'spkr'].includes(id[0])) { // amp or speaker score element
                    input.value = teamData.scoring[id[0]][inputID] ?? '';
                } else { // non-table and non-score element
                    const state = input.type === 'checkbox' ? 'checked' ?? false: 'value' ?? '';

                    input[state] = teamData[sec][inputID];
                }
            });
        }
    }

    await refreshTeams();

    if (validTeam(teamData.team)) {
        const selected = `${teamData.team},${teamData.comp},${teamData.round}`;

        getElem('teams').value = selected;
    } else {
        getElem('teams').value = 'select';
    }

    if (push) {
        pushState(teamData);
    }

    aStop();
    eStop();
}

const scrapeTeamData = () => {
    let teamData = emptyTeam();
    const teams = getElem('teams');

    if (teams.selectedIndex < 2) {
        return teamData;
    }

    teamData.team = getTeam();
    teamData.comp = getElem('comp').value;
    teamData.round = getElem('round').value;
    teamData.scoring.amp.a = 3

    const secs = ['auto', 'teleop', 'scoring'];

    for (const sec of secs) {
        getElem('.input', 'queryAll', getElem(sec).nextElementSibling).forEach((input) => {
            if (input.value || input.checked) {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0])) { // auto or teleop table element
                    teamData[id[0]][id[1]][id[2]] = input.value;
                } else if (['amp', 'spkr'].includes(id[0])) { // amp or speaker score element
                    teamData.scoring[id[0]][inputID] = input.value;
                } else { // non-table and non-score element
                    const state = input.type === 'checkbox' ? 'checked': 'value';

                    teamData[sec][inputID] = input[state];
                }
            }
        });
    }
    
    console.log('scraped', teamData);

    return teamData;
}

const encodeData = async (data) => {
    const stream = new Blob([JSON.stringify(data)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedReadableStream).blob();
    const ab = await blob.arrayBuffer();

    return encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(ab))));
}

const decodeData = async (encodedData) => {
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

        return undefined;
    }
}

/*
const formatTeam = event => {
    const value = event.target.value;

    if (parseInt(value) ===0) {
        event.target.value = '';
    }

    if (parseInt(value) > 9999) {
        if (value !== '10000') {
            event.target.value = value.slice(0, -1);
        } else {
            event.target.value = '9999';
        }
    }

    if (value.length < 4 && parseInt(value) !== 0) {
        event.target.value = '0'.repeat(4 - value.length) + value;
    } else if (value.length > 4 && value[0] ==='0') {
        event.target.value = value.slice(1);
    }
    }
*/

const formatNumber = event => {
    if (event.target.value[0] ==='0') {
        event.target.value = event.target.value.slice(1);
    }

    if (parseInt(event.target.value) > 999) {
        event.target.value = event.target.value.slice(0, -1);
    }
}

const beginScan = async () => {
    let popup = document.getElementById('scanner')
    popup.style.display = 'flex';

    let scanner = new Html5Qrcode('cameraStream', {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
    });

    popup.scanner = scanner;

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
    await scanner.start({ facingMode: "environment" }, { fps: framerate, verbose: true },
                        callback, errorCallback);
    scanner.applyVideoConstraints({ frameRate: framerate });
}

const closeScanner = () => {
    let popup = document.getElementById('scanner');
    popup.style.display = 'none';
    popup.scanner && popup.scanner.stop();
    popup.scanner = null;
}

const generateQRCode = () => {
    encodeData().then((data) => {
        getElem('qrcode').textContent = '';

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

const generateCSV = () => {
    const flattenTeams = async () => {
        let matchList = [];
        const matches = await dbClient.getMatches();

        for (let match of matches.entries()) {
            match = match[1];
            const matchIndex = [];

            for (const {sec, count} of [{sec: 'auto', count: 3}, {sec: 'teleop', count: 6}]) {
                const cats = ['succeeds', 'fails', 'method'];
                const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

                for (let i = 0; i < count; i++) {
                    for (let j = 0; j < 3; j++) {
                        matchIndex.push(match?.[sec]?.[cats[j]]?.[cons[i]] ?? 'N/A');
                    }
                }
            }

            matchList.push(matchIndex);
        }

        return matchList;
    }

    const teamList = flattenTeams();
    const csv = stringify(teamList);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], 'csv.csv');

    return file;
}

const download = (file, fileName) => {
    const a = document.createElement('a');
    a.setAttribute('href', URL.createObjectURL(file));
    a.setAttribute('download', fileName);

    a.click();
}

const validTeam = (team) => {
    const teamNum = parseInt(team) ?? false;

    return team && teamNum && Number.isInteger(teamNum) && [3, 4].includes(team.length);
}

const switchMatch = () => {
    getElem('teams').value = "select";
    currentTeam = '';
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

    if (select === 'select') {
        clearTeam();
        closeSections();
    }

    if (select ==='new') {
        const newTeam = prompt('new team');
        // TODO validate team
        let teamData = emptyTeam();

        currentTeam = newTeam;

        teamData.team = currentTeam;
        teamData.comp = getElem('comp').value;
        teamData.round = getElem('round').value;

        await saveMatch(teamData);

        await refreshTeams();

        presentTeamData(teamData, true);
    } else if (select !== '') {
        let s = select.split(',');
        let [team, comp, round] = s;
        const teamData = await dbClient.getMatch(comp, round, team);
        currentTeam = team;

        if (teamData) {
            console.log(teamData)
            presentTeamData(teamData, true);
        }
    }

    openSection('auto');
}

const closeSections = (saveSec = '') => {
    const sections = getElem('collapsible', 'class');

    for (let s of sections) {
        s.classList.remove('active');
        s.classList.add('inactive');
        s.nextElementSibling.style.display = 'none';
    }

    localStorage.setItem('sec', saveSec);
}

const openSection = (id) => {
    const section = getElem(id);

    closeSections(id);

    if (getTeam()) {
        section.classList.remove("inactive");
        section.classList.add("active");
        section.nextElementSibling.style.display = "block";
    }
}

const sync = async () => {
    const teamData = scrapeTeamData();

    if (teamData.team.length > 2) {
        await saveMatch(teamData);

        console.log('synced', teamData);
    }
};

const exportTeam = async (input) => {
    switch (input) {
        case 'export-url':
            navigator.share({url: 'https://scouting.minutebots.org/?data=' + (await encodeData(scrapeTeamData()))});

            break;
        case 'export-data':
            navigator.share({data: JSON.stringify(scrapeTeamData())});

            break;
        case 'export-csv':

            break;
        case 'export-qrcode':
            generateQRCode();

            break;
        case 'export-qrcode':

            break;
        case 'download-csv':
            const date = new Date();
            const currentDate = [date.getDate(), date.getMonth() + 1, date.getFullYear()].join('-') + 
                                ', ' + `${date.getHours()}.` + `${date.getMinutes()}.` + date.getSeconds();

            const fileName = 'teams ' + currentDate + '.csv';

            download(generateCSV(), fileName);

            break;
        case 'download':
            const jsonString = JSON.stringify(scrapeTeamData());

            const blob = new Blob([jsonString], { type: 'application/json' });

            const data = document.createElement('a');
            data.setAttribute('href', URL.createObjectURL(blob));
            data.setAttribute('download', 'data.json');
            data.click();
            
            break;
    }

    getElem('export').value = 'share';
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('load', loadData);
    window.addEventListener('popstate', popState);

    onLoad();

    getElem('comp').addEventListener('change', switchMatch);
    getElem('round').addEventListener('change', switchMatch);
    getElem('teams').addEventListener('change', switchTeam);

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id));
    });

    getElem('.input', 'queryAll').forEach((input) => {
        input.addEventListener('input', sync);
    });

    getElem('export').addEventListener('change', (input) => {
        exportTeam(input.target.value)
    });

    getElem('a-stop').addEventListener('input', aStop);

    getElem('e-stop').addEventListener('input', eStop);

    getElem('.number', 'queryAll').forEach( (input) => {
        input.addEventListener('input', (event) => formatNumber(event));

        input.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '');
        });

        input.placeholder = '0';
        input.min = '0';
    });
});

window.closeScanner = closeScanner;
window.closeSections = closeSections;
window.decodeData = decodeData;
window.emptyTeam = emptyTeam;
window.encodeData = encodeData;
window.getElem = getElem;
window.getMatch = getMatch;
window.getTeam = getTeam;
window.loadData = loadData;
window.onLoad = onLoad;
window.openSection = openSection;
window.presentTeamData = presentTeamData;
window.refreshTeams = refreshTeams;
window.saveMatch = saveMatch;
window.scrapeTeamData = scrapeTeamData;
window.generateCSV = generateCSV;

window.exportTeam = exportTeam;

window.dbClient = dbClient;
