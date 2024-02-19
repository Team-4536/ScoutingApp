'use strict';

import { DBClient } from '../app-client.js';
import { stringify as csv_stringify } from "./csv-stringify.js";

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
    },

    'scoring': {
        
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
    const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null;
    const comp = getElem('comp').value;
    const round = getElem('round').value;
    const teamNumbers = await dbClient.getMatchKeys(comp, round) || [];
    let newSelect = document.createElement('select');
    
    newSelect.addEventListener('change', switchTeam);

    newSelect.setAttribute('id', 'teams');

    {
        let selectOption = document.createElement('option');

        selectOption.value = 'select';
        selectOption.textContent = 'Select team ...';

        newSelect.add(selectOption);

        let newOption = document.createElement('option');

        newOption.value = 'new';
        newOption.textContent = 'New team ...';

        newSelect.add(newOption);
    }

    for (const team of teamNumbers) {
        let teamOption = document.createElement('option');

        teamOption.value = team;
        teamOption.textContent = team[0];

        if (team == selectedTeam) {
            teamOption.selected = true;
        }
        
        console.log(teamOption.value.split(',').slice(1).join(','))
        console.log([getElem('comp').value, getElem('round').value].join(','))

        if (getMatch().split(',').slice(1).join(',') === teamOption.value.split(',').slice(1).join(',')) {
            newSelect.appendChild(teamOption);
        }
    }

    teams.replaceWith(newSelect);

    teams.value = getMatch();

    console.log('team options', teams.options);
    console.log('selected team', teams.value);
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
                            await saveMatch(scrapeTeamData());
                        });

                        th.appendChild(plus);
                        th.appendChild(input);
                    }

                    const cat = catItems[j].className
                    const con = cons[i]

                    input.setAttribute('id', [table, cat, con].join('-'));
                    input.classList.add('table-input');
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
    let url = window.location.search;
    let teamData = JSON.parse(dataObject);
    
    console.log('url', location.origin + location.pathname + url)

    const search = new URLSearchParams(url);

    if (search.has('data')) { // if URL has data param
        const dataParam = search.get('data');

        console.log('has data param', dataParam);

        const data = await decodeData(dataParam);

        if (data) { // if data param could be decoded
            console.log('decoded data', data);

            teamData = data;
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
        } else { // if URL does not have team param
            console.log('has comp and round params', 'comp=' + compParam + ', round=' + roundParam);
        }
    }




    // const asearch = new URLSearchParams(url);
    // url = url.slice(1);

    // if (search.has('team')) { // if data param is in URL
    //     const team = asearch.get('team');
    //     const comp = asearch.get('comp');
    //     const round = asearch.get('round');
    //     const storedTeamData = await dbClient.getMatch(comp, round, team);

    //     if (storedTeamData) { // if team exists
    //         currentTeam = storedTeamData.team ?? undefined;
    //     } else { // if team does not exist
    //         if (validTeam(team)) { // if new team is valid
    //             teamData.team = team;
    //             await saveMatch(teamData);
    //             currentTeam = team;
    //         } else { // if new team is not valid
    //             confirm('searched team ' + team + ' does not exist, and is invalid');
    //             history.replaceState(null, null, location.origin + location.pathname);
    //         }
    //     }
    // } else { // if data param is not in URL
    //     const data = await decodeData(url);

    //     if (data) { // if data could be read
    //         d = data;
    //         const team = data.team;
            
    //         if (team) { // if team is in data
    //             pushState(data);
    //             await saveMatch(data);
    //             currentTeam = team;
    //         }
    //     } else { // if data could not be read
    //         // Add visable error message
    //     }
    // }

    // refreshTeams();
}

const aStop = () => {
    getElem('a-reason').disabled = !getElem('a-stop').checked;
}

const eStop = () => {
    getElem('e-reason').disabled = !getElem('e-stop').checked;
}

const presentTeamData = async (teamData) => {
    await refreshTeams();

    if (teamData && typeof teamData === 'object') {
        if (teamData.team) {
            currentTeam = teamData.team;
        }

        getElem('comp').value = teamData.comp || '';
        getElem('round').value = teamData.round || '';

        const elements = [
            {elem: 'left-zone', sec: 'auto'},
            {elem: 'a-stop', sec: 'auto'},
            {elem: 'a-reason', sec: 'auto'},
            {elem: 'e-stop', sec: 'teleop'},
            {elem: 'e-reason', sec: 'teleop'}
        ];
    
        for (const {elem, sec} of elements) {
            const element = getElem(elem);
    
            let state;
            if (element.type === 'checkbox') {
                state = element.checked;
            } else {
                state = element.value;
            }
    
            teamData[sec][elem] = state;
        }

        const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

        for (const {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
            const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));
    
            for (let i = 0; i < count; i++) {
                for (let j = 1; j < 4; j++) {
                    const cat = catItems[j].className;
                    const con = cons[i];
                    const element = getElem([table, cat, con].join('-'));
                    const value = teamData?.[table]?.[con]?.[cat] || '';

                    element.value = value;
                }
            }
        }
    }

    aStop();
    eStop();
}

const scrapeTeamData = () => {
    let teamData = JSON.parse(dataObject);
    const teams = getElem('teams');

    if (teams.selectedIndex < 2) {
        return teamData;
    }

    teamData.team = getTeam();
    teamData.comp = getElem('comp').value;
    teamData.round = getElem('round').value;

    const elements = [
        {elem: 'left-zone', sec: 'auto'},
        {elem: 'a-stop', sec: 'auto'},
        {elem: 'a-reason', sec: 'auto'},
        {elem: 'e-stop', sec: 'teleop'},
        {elem: 'e-reason', sec: 'teleop'}
    ];

    for (const {elem, sec} of elements) {
        const element = getElem(elem);

        let state;
        if (element.type === 'checkbox') {
            state = element.checked;
        } else {
            state = element.value;
        }

        teamData[sec][elem] = state;
    }

    const cons = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    for (const {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 6}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 1; j < 4; j++) {
                const cat = catItems[j].className;
                const con = cons[i];
                const value = getElem([table, cat, con].join('-')).value;

                if (value) {
                    teamData[table][cat][con] = value;
                }
            }
        }
    }
    
    return teamData;
}

const encodeData = async data => {
    const stream = new Blob([JSON.stringify(data)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedReadableStream).blob();
    const ab = await blob.arrayBuffer();

    return btoa(String.fromCharCode(...new Uint8Array(ab)));
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
        currentTeam = team;

        if (teamData) {
            presentTeamData(teamData, true);
        }
    }
    openSection('auto');
}

function closeSections(id) {
    const sections = getElem('collapsible', 'class')

    for (let s of sections) {
        s.classList.remove('active');
        s.classList.add('inactive');
        s.nextElementSibling.style.display = 'none';
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
    section.classList.remove('inactive');
    section.classList.add('active');
    section.nextElementSibling.style.display = 'block';
}

const sync = async () => {
    const teamData = scrapeTeamData();

    if (teamData.team.length > 2) {
        await saveMatch(teamData);
    }
};

const exportTeam = async () => {
    const exportSelect = getElem('export', 'id');

    switch (exportSelect.value) {
        case 'export-url':
            console.log('encode, decode, data', await decodeData(await encodeData(await scrapeTeamData())));
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
            csv = document.createElement('a');
            const csvData = 'data:text/csv;charset=utf-8,' +
                            'a,b,c,d,e\n' +
                            '1,2,3,4,5\n' +
                            'hola,hello,"blah blah blah!! (:","testy","this be a test"';
            csv.setAttribute('href', encodeURI(csvData));
            csv.setAttribute('download', 'test.csv');
            csv.click();

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

    exportSelect.value = 'share';
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

    getElem('.table-input', 'queryAll').forEach((input) => {
        input.addEventListener('change', sync);
    });

    getElem('export').addEventListener('change', exportTeam);

    getElem('close-scanner').addEventListener('click', closeScanner);

    getElem('a-stop').addEventListener('input', aStop);

    getElem('e-stop').addEventListener('input', eStop);

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener('click', (event) => openSection(event.target.id));
    });

    getElem('.number', 'queryAll').forEach( (input) => {
        input.addEventListener('input', (event) => formatNumber(event));

        input.placeholder = '0';
        input.type = 'number';
        input.min = '0';
    });

    getElem('.table-input', 'queryAll').forEach((input) => {
        input.addEventListener('change', async () => {
            await saveMatch(scrapeTeamData());
            refreshTeams();
        });
    });
});

window.scrapeTeamData = scrapeTeamData;
window.presentTeamData = presentTeamData;
window.getTeam = getTeam;
window.getMatch = getMatch;
window.getElem = getElem;
window.saveMatch = saveMatch;
window.encodeData = encodeData;
window.refreshTeams = refreshTeams;
window.decodeData = decodeData;

window.dbClient = dbClient;
