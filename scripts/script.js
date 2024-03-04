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

    let state;

    if (data.team) {
        state = {
            team: data.team,
            comp: data.comp,
            round: data.round
        };
    }else {
        state = {
            team: '',
            comp: data.comp,
            round: data.round
        };
    }
    
    const title = `MinuteBots Scouting - Team ${data.team} - Round ${data.round}`;
        let url;

if (data.team) {
        url = `${location.origin}${location.pathname}?team=${data.team}&comp=${data.comp}&round=${data.round}`;
} else {
    url = `${location.origin}${location.pathname}?comp=${data.comp}&round=${data.round}`;
}

    if (replace) {
        history.replaceState(state, title, url);
    } else {
        history.pushState(state, title, url);
    }
};

const setTeam = (team) => {
    currentTeam = team;

    const session = sessionStorage.getItem('session');

    if (localStorage.getItem(session)) {
        console.log('match', getMatch())
        localStorage.setItem(session, getMatch());
    } else {
        session();
    }
}

const getTeam = () => {
    return currentTeam;
}

const setMatch = (team, comp, round) => {
    team && setTeam(team);

    if (comp) {
        getElem('comp').value = comp;
    }
    
    if (round) {
        getElem('round').value = round;
    }

    console.log('set match', team, comp, round);

    getElem('teams').value = getMatch();
}

const getMatch = () => {
    return [getTeam(), getElem('comp').value, getElem('round').value].join(',');
}

const refreshTeams = async (team = false) => {
    const teams = getElem('teams');
    const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null
    const match = getMatch().split(',');
    const teamNumbers = await dbClient.getMatchKeys(match[1], match[2]) || [];
    let newSelect = document.createElement('select');
    
    newSelect.addEventListener('change', switchTeam);

    newSelect.setAttribute('id', 'teams')
    {
        let selectOption = document.createElement('option');
        selectOption.value = 'select';
        selectOption.disabled = true;
        selectOption.selected = true;
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


const onLoad = async () => {
    const cons = ['amp', 'close speaker', 'far speaker'];

    for (let {table, count} of [{table:'auto', count: 2}, {table: 'teleop', count: 3}]) {
        const catItems = getElem('tr', 'queryAll', getElem('[data-sec=' + table + ']', 'query'));

        for (let i = 0; i < count; i++) {
            for (let j = 0; j < 2; j++) {
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
                        const minus = document.createElement('button');
                        input = document.createElement('input');
                        input.classList.add('number', 'input');

                        plus.textContent = '-';
                        plus.classList.add('incr');

                        minus.textContent = '+';
                        minus.classList.add('incr');
                        minus.style['marginRight'] = '30px'

                        minus.addEventListener('click', async () => {
                            input.value = (parseInt(input.value) || 0) + 1;
                            if ((parseInt(input.value) || 0) - 1 > 998) {
                                input.value = 999;
                            }

                            // if (event.value[0] ==='0') {
                            //     event.value = event.value.slice(1);
                            // }
                        
                            // if (parseInt(event.value) > 999) {
                            //     event.value = event.value.slice(0, -1);
                            // }

                            await sync();
                        });

                        plus.addEventListener('click', async () => {
                            input.value = (parseInt(input.value) || 0) - 1;
                            if ((parseInt(input.value) || 0) - 1 < 0) {
                                input.value = 0;
                            }

                            // if (event.value[0] ==='0') {
                            //     event.value = event.value.slice(1);
                            // }

                            // if (parseInt(event.value) > 999) {
                            //     event.value = event.value.slice(0, -1);
                            // }

                            await sync();
                        });

                        th.appendChild(plus);
                        th.appendChild(input);
                        th.appendChild(minus);
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

    const shareOptions = [['csv', 'csv file'],
                         ['json', 'json file'],
                         ['txt', 'text file'],
                         ['url', 'url'],
                         ['scan', 'qrcode']];

    shareOptions.forEach((option) => {
        const button = document.createElement('button');
        button.innerHTML = '&times;';
        button.classList.add('share-as-button');
        button.addEventListener('click', startShare);

        const label = document.createElement('b');
        label.textContent = option[1];
        label.style.margin = '10px';

        const div = document.getElementById((option[0] ? option[0]:option) + '-div');
        div.insertBefore(label, div.firstChild);
        div.insertBefore(button, div.firstChild);
    });

    // download(generateCSV(), 'csv')
}

const populateQRCode = async () => {
    const qrcodeComp = getElem('qrcode-comp');
    const qrcodeRound = getElem('qrcode-round');
    const qrcodeTeam = getElem('qrcode-team');

    const compList = [];
    const roundList = [];
    const teamList = [];

    await dbClient.getMatches().forEach((match) => {
        const [team, comp, round] = [match?.team, match?.comp, match?.round];

        if (team && validTeam(team) && comp && round) {
            teamList.push(team);

            if (!compList.includes(comp)) {
                compList.push(comp);
            }
            
            if (!roundList.includes(round)) {
                roundList.push(round);
            }
        }
    });

    teamList.sort();
    compList.sort();
    roundList.sort();

    const [team, comp, round] = getMatch().split(',');

    qrcodeComp.value = comp;
    qrcodeRound.value = round;
    qrcodeTeam.value = team;
}

const share = async (shareOption) => {
	startShare();
        const match = getMatch().split(',');
    switch (shareOption) {
        case 'scan':
            
            // const qrcodeButton = getElem('qrcode-button');

            if (match[0] && match[1] && match[2]) {
                generateQRCode(await dbClient.getMatch(match[1], match[2], match[0]),
                            Math.min(innerHeight, innerWidth) * .6,
                            Math.min(innerHeight, innerWidth) * .6);

                getElem('qrcode-team').innerHTML = 'selected match: ' + match[2]
                                                   + ', team: ' + match[1] + ', competition: ' + match[0];
                
                // qrcodeButton.style.display = 'block';
                // populateQRCode();
            } else {
                getElem('qrcode-team').textContent = 'no team selected to generate qrcode from'
                // qrcodeButton.style.display = 'none';
            }

            break;

            case'csv':
            const a = getElem('csv-comp')
            if(match[1]){
            a.textContent='selected comp to share: '+match[1]
            }else{
            a.textContent='no comp selected'
            }
            break;
    }

	document.getElementById(shareOption + '-div').style.display = 'block';

	const select = document.getElementById('share-as');
	select.hidden = true;
	select.value = 'select';
}

const startShare = () => {
	document.getElementById('share-as').hidden = false;

	Array.from(document.getElementById('share-modal')
                       .getElementsByClassName('option-div')).forEach(
                          (div) => div.style.display = 'none');

	document.getElementById('share-modal').style.display = 'block';
}

const closeModal = (id) => {
	if (typeof id === 'string' || id.id) {
		id = id.id ? id.id: id;
		const modal = document.getElementById(id);

		if (id === 'share-modal') {
			modal.style.display = 'none';
		}
	} else {
		Array.from(document.getElementsByClassName('modal')).forEach((modal) => {
			modal.style.display = 'none';
		});
	}
}

const session = () => {
    let session = sessionStorage.getItem('session');
    
    if (!session) {
        session = Math.random();

        sessionStorage.setItem('session', session);
    }

    window.localStorage.setItem(session, getMatch());
}

const popState = async () => {
    loadData();

    console.log('popState called');
}

const loadData = async () => {
    await navigator.serviceWorker.ready;

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

    await presentTeamData(teamData, push);
    // refreshTeams();

    const sec = sessionStorage.getItem('sec');

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
    if (teamData) {
        const secs = ['auto', 'teleop'];

        for (const sec of secs) {
            getElem('.input', 'queryAll', getElem(sec).nextElementSibling).forEach((input) => {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0])) { // auto or teleop table element
                    input.value = teamData[id[0]][id[1]][id[2]] ?? '';
                } else { // non-table element
                    const state = input.type === 'checkbox' ? 'checked' ?? false: 'value' ?? '';

                    input[state] = teamData[sec][inputID];
                }
            });
        }
    }

    // setMatch(teamData.team || '', teamData.comp || 'grand-forks', teamData.round || 1);
    await refreshTeams();
    setMatch(teamData.team || '', teamData.comp || getElem('comp')[0].value, teamData.round || 1);

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

    await refreshTeams()
    if (validTeam(teamData.team)) {
        const selected = `${teamData.team},${teamData.comp},${teamData.round}`;

        getElem('teams').value = selected;
    }  else {
        getElem('teams').value = 'select';
    }
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

    const secs = ['auto', 'teleop'];

    for (const sec of secs) {
        getElem('.input', 'queryAll', getElem(sec).nextElementSibling).forEach((input) => {
            if (input.value || input.checked) {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0])) { // auto or teleop table element
                    teamData[id[0]][id[1]][id[2]] = input.value;
                } else { // non-table element
                    const state = input.type === 'checkbox' ? 'checked': 'value';

                    teamData[sec][inputID] = input[state];
                }
            }
        });
    }
    
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
        const bytes = Uint8Array.from(atob(decodeURIComponent(encodedData)), c => c.charCodeAt(0));
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

const beginScan = async (id) => {
    let popup = document.getElementById('scanner')
    popup.style.display = 'flex';

    let scanner = new Html5Qrcode('cameraStream', {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
    });

    popup.scanner = scanner;

    const callback = (text, detail) => {
        const data = JSON.parse(text.replace('https://scouting.minutebots.org/?data=', '')).data
        console.log(data)
        const dataObject = decodeData(data)
        console.log(dataObject)
        // console.log('got /scan', text, detail);
        // scanner.pause(true);
    };

    const errorCallback = (error) => {
        // console.log('scanner error', error);
    };

    let framerate = 15;
    let cameras = await Html5Qrcode.getCameras()
    console.log(cameras);
    
    await scanner.start({ facingMode: 'environment' }, { fps: framerate, verbose: true },
                        callback, errorCallback);

    scanner.applyVideoConstraints({ frameRate: framerate });
}

const closeScanner = () => {
    let popup = document.getElementById('scanner');
    popup.style.display = 'none';
    popup.scanner && popup.scanner.stop();
    popup.scanner = null;
}

const generateQRCode = (teamData, length = screen.height * .8) => {
    console.log(teamData)
    encodeData(teamData).then((data) => {
        getElem('qrcode').textContent = '';

        let qrcodeDataObject = { 'ver': 1, 'data': data }

        new QRCode(getElem('qrcode'), {
            text: `https://scouting.minutebots.org/?data=${JSON.stringify(qrcodeDataObject)}`,
            correctLevel: QRCode.CorrectLevel.Q,
            width: length,
            height: length
        });

        console.log(`https://scouting.minutebots.org/?data=${JSON.stringify(qrcodeDataObject)}`)
    });

    // getElem('qrcode-div').style.display = 'block';
    // getElem('qrcode').style.display = 'block';
}

const generateCSV = async (includeTopRow) => {
    const flattenTeams = async () => {
        let matchList = [];
        const matches = await dbClient.getMatches();

        if (includeTopRow) {
            matchList.push([
                'Team',
                'Alliance',
                'Round',
                'Scouter',
                'Auto-A Stop',
                'Teleop-E Stop',
                'Auto-Left Alliance Zone',

                'Auto-Amp Succeed',
                'Auto-Amp Fail',
                'Teleop-Amp Succeed',
                'Teleop-Amp Fail',
                'Amp Method',

                'Auto-Speaker Succeed',
                'Auto-Speaker Fail',
                'Teleop-Speaker Succeed',
                'Teleop-Speaker Fail',
                'Speaker Method',

                'Auto-Floor Intake Succeed',
                'Auto-Floor Intake Fail',
                'Teleop-Floor Intake Succeed',
                'Teleop-Floor Intake Fail',
                'Floor Intake Method',

                'Teleop-Source Intake Succeed',
                'Teleop-Source Intake Fail',
                'Source Intake Method',

                'Climb',
                'Trap',
                'Total Score',
                'Win / Lose / Tie',
                'Harmony',
                'Ensemble',
                'Cooperation',
                'Collisions',
                'Made Spotlight Notes',
                'Missed Spotlight Notes'
            ]);
        } else {
            matchList.push([]);
        }

        for (let match of matches.entries()) {
            match = match[1];
            const matchIndex = [];
            
            [
                match?.team ?? 'NaN',
                'NaN',
                match?.round ?? 'NaN',
                'NaN',
                match?.auto?.['a-stop'] ?? 'NaN',
                match?.teleop?.['e-stop'] ?? 'NaN',
                match?.auto?.['left-zone'] ?? 'NaN'
            ].forEach(value => matchIndex.push(`${value}`));

            const cons = ['amp', 'spkr', 'flr', 'src'];
            const sec = ['auto', 'auto', 'teleop', 'teleop', 'teleop'];
            const cats = ['succeeds', 'fails', 'succeeds', 'fails', 'method'];

            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 5; j++) {
                    if (i !== 3) {
                        matchIndex.push(match?.[sec[j]]?.[cats[j]]?.[cons[i]] ?? '');
                    } else {
                        if (j < 3) {
                            matchIndex.push(match?.[sec[j + 2]]?.[cats[j + 2]]?.[cons[i]] ?? '');
                        }
                    }
                }
            }

            matchIndex.push(
                match?.scoring?.climb ?? 'NaN',
                'NaN',
                'NaN',
                'NaN',
                match?.scoring?.harmony ?? 'NaN',
                match?.scoring?.ensemble ?? 'NaN',
                match?.scoring?.coop ?? 'NaN',
                match?.collisions ?? 'NaN',
                'NaN',
                'NaN'
            );

            matchList.push(matchIndex ?? []);
        }

        return matchList;
    }

    const teamList = await flattenTeams();
    const csv = stringify(teamList);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], 'csv.csv');

    return file;
}

const download = async (file, fileName) => {
    const a = document.createElement('a');
    a.setAttribute('href', URL.createObjectURL(await file));
    a.setAttribute('download', fileName);

    a.click();
}

const validTeam = (team) => {
    const teamNum = parseInt(team) ?? false;

    return team && teamNum && Number.isInteger(teamNum) && [3, 4].includes(team.length);
}

const switchMatch = () => {
    const a = getElem('round').value
    const b = getElem('comp').value

    if(a && b) {
        pushState({team: '', round:a, comp:b})
    } else {
        pushState()
    }
    getElem('teams').value = 'select';
    clearTeam()
    closeSections();
    refreshTeams();
    console.log('current match', getMatch())
};

const emptyTeam = () => {
    return JSON.parse(dataObject);
}

const clearTeam = () => {
    currentTeam = '';
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
        
        if (validTeam(newTeam)) {
            clearTeam()
            let teamData = emptyTeam();

            setTeam(newTeam);

            teamData.team = currentTeam;
            teamData.comp = getElem('comp').value;
            teamData.round = getElem('round').value;

            await saveMatch(teamData);

            await refreshTeams();

            presentTeamData(teamData, true);
        } else if (newTeam.replace(/\D/g, '') !== newTeam) {
            confirm(newTeam + ' - please enter a valid team number');
        } else {
            confirm(newTeam + ' is not a valid team number');
        }
    } else if (select !== '') {
        let splitMatch = select.split(',');
        let [team, comp, round] = splitMatch;
        const teamData = await dbClient.getMatch(comp, round, team);
        setTeam(team);

        if (teamData) {
            console.log(teamData)
            presentTeamData(teamData, true);
        }
    }

    openSection('auto');
}

const downloadCSV = () => {
    const date = new Date();
    const currentDate = [date.getDate(), date.getMonth() + 1, date.getFullYear()].join('-') + 
                        ', ' + `${date.getHours()}.` + `${date.getMinutes()}.` + date.getSeconds();

    const fileName = 'teams ' + currentDate + '.csv';
    const includeTopRow = getElem('csv-top-row').checked;

    download(generateCSV(includeTopRow), fileName);
}

const closeSections = (saveSec = '') => {
    const sections = getElem('collapsible', 'class');

    for (let s of sections) {
        s.classList.remove('active');
        s.classList.add('inactive');
        s.nextElementSibling.style.display = 'none';
    }

    sessionStorage.setItem('sec', saveSec);
}

const toggleQRCode = (boolean) => {
    const qrcode = document.getElementById('qrcode');
    const qrcodeButton = document.getElementById('qrcode-button');

    if (boolean === 'none' || boolean === 'inline-block') {
        qrcode.style.display = boolean;
        qrcodeButton.textContent = boolean === 'none' ? 'show qrcode': 'hide qrcode';
    } else if (typeof boolean === 'boolean') {
        qrcode.style.display = boolean ? 'inline-block': 'none';
        qrcodeButton.textContent = boolean ? 'hide qrcode': 'show qrcode';
    } else {
        const none = qrcode.style.display === 'none';

        qrcode.style.display = none ? 'inline-block': 'none';
        qrcodeButton.textContent = none ? 'hide qrcode': 'show qrcode';
    }
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
    }
};

// const exportTeam = async (input) => {
//     switch (input) {
//         case 'export-url':
//             navigator.share({url: 'https://scouting.minutebots.org/?data=' + (await encodeData(scrapeTeamData()))});

//             break;
//         case 'export-data':
//             navigator.share({data: JSON.stringify(scrapeTeamData())});

//             break;
//         case 'export-csv':

//             break;
//         case 'export-qrcode':
//             generateQRCode();

//             break;
//         case 'export-qrcode':

//             break;
//         case 'download-csv':
//             downloadCSV();

//             break;
//         case 'download':
//             const jsonString = JSON.stringify(scrapeTeamData());

//             const blob = new Blob([jsonString], { type: 'application/json' });

//             const data = document.createElement('a');
//             data.setAttribute('href', URL.createObjectURL(blob));
//             data.setAttribute('download', 'data.json');
//             data.click();
            
//             break;
//     }

//     getElem('export').value = 'share';
// }

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('load', loadData);
    window.addEventListener('popstate', popState);

    onLoad();
    session();
    generateCSV()

    getElem('.minusbutton', 'queryAll').forEach(async (button) => {
        button.addEventListener('click', async () => {
            document.getElementById('round').value = parseInt(document.getElementById('round').value) - 1
            const a = parseInt(document.getElementById('round').value) - 1
            console.log(a)
            if(a < 1) {
                document.getElementById('round').value = '1'
            }

            if (a > 90) {
                document.getElementById('round').value = '90'
            }

            if (Math.round(a) != a) {
                document.getElementById('round').value = `${Math.round(a)}`
            }

            switchMatch();
            await sync();

        });
    })
    getElem('.plusbutton', 'queryAll').forEach(async (button) => {
        button.addEventListener('click', async () => {
            document.getElementById('round').value = parseInt(document.getElementById('round').value) + 1
            const a = parseInt(document.getElementById('round').value) + 1
            console.log(a)
            if(a < 1) {
                document.getElementById('round').value = '1'
            }

            if (a > 90) {
                document.getElementById('round').value = '90'
            }

            if (Math.round(a) != a) {
                document.getElementById('round').value = `${Math.round(a)}`
            }

            switchMatch();
            await sync();

        });
    })
    getElem('round').addEventListener('input', async () => {
            const a = parseInt(document.getElementById('round').value)
            if (a < 1) {
                document.getElementById('round').value = '1'
            }

            if (a > 90) {
                document.getElementById('round').value = '90'
            }

            if (a) {
                document.getElementById('round').value = `${Math.round(a)}`
            } else {
                document.getElementById('round').value ='1'
            }

            switchMatch();
            await sync();

        });

    getElem('comp').addEventListener('change', switchMatch);
    getElem('teams').addEventListener('change', switchTeam);
    getElem('csv-share-all').addEventListener('click', async () => {
        const shareData = {
            title: "csv",
            text: "CSV data",
            file: await generateCSV('all-teams'),
        };

        navigator.share(shareData);
    });

    getElem('.collapsible', 'queryAll').forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id));
    });

    getElem('.input', 'queryAll').forEach((input) => {
        input.addEventListener('input', sync);
    });

    // getElem('export').addEventListener('change', (input) => {
    //     exportTeam(input.target.value)
    // });

    getElem('a-stop').addEventListener('input', aStop);

    getElem('e-stop').addEventListener('input', eStop);

    window.addEventListener('click', (event) => closeModal(event.target.id));

    document.getElementById('share').addEventListener('click', startShare);
    document.getElementById('quit-share').addEventListener('click', closeModal);
    document.getElementById('share-as').addEventListener('change', (event) => share(event.target.value));
    document.getElementById('csv-download-all').addEventListener('click', downloadCSV);
    // document.querySelectorAll('#qrcode, #qrcode-button').forEach((qrcodeToggle) => {
    //     qrcodeToggle.addEventListener('click', toggleQRCode);
    // });


    getElem('.number', 'queryAll').forEach( (input) => {
        input.addEventListener('input', (event) => formatNumber(event));

        input.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '');
        });

        input.placeholder = '0';
        input.min = '0';
    });

    document.getElementById('close-scanner').addEventListener('click', closeScanner);

    window.addEventListener('beforeunload', () => {
        const session = sessionStorage.getItem('session');

        if (localStorage.getItem(session)) {
            localStorage.removeItem(session);
            sessionStorage.removeItem('session');
        }
    });

    // window.addEventListener("beforeunload", function (e) {
    //     var confirmationMessage = "\o/";
        
    //     (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    //     return confirmationMessage;                            //Webkit, Safari, Chrome
    // });
});

window.beginScan = beginScan;
window.closeScanner = closeScanner;
window.closeSections = closeSections;
window.decodeData = decodeData;
window.download = download;
window.downloadCSV = downloadCSV;
window.emptyTeam = emptyTeam;
window.encodeData = encodeData;
// window.exportTeam = exportTeam;
window.generateCSV = generateCSV;
window.generateQRCode = generateQRCode;
window.getElem = getElem;
window.getMatch = getMatch;
window.getTeam = getTeam;
window.loadData = loadData;
window.toggleQRCode = toggleQRCode;
window.onLoad = onLoad;
window.openSection = openSection;
window.presentTeamData = presentTeamData;
window.refreshTeams = refreshTeams;
window.setMatch = setMatch;
window.saveMatch = saveMatch;
window.scrapeTeamData = scrapeTeamData;
window.session = session;

window.dbClient = dbClient;
