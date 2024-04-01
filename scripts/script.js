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

        'succeeds': {},
        'fails': {},

        'auto-floor-intake': null
    },

    'teleop': {
        'e-stop': null,
        'e-reason': '',

        'succeeds': {},
        'fails': {},

        'source-intake': null,
        'teleop-floor-intake': null,
        'climb': null,
        'climb-others': null,
        'trap': null
    },

    'post-game': {
        'defense': null,
        'forced-defence': null,
        'break': null,
        'disable': null,
        'comments': ''
    }
});

const saveMatch = async (data) => {    
    if (validTeam(data ? data.team: undefined) && data.comp && data.round) {
        await dbClient.putMatch(data);
    }
};

const pushState = async (data, replace = false) => {
    let state;

    if (data.team) {
        state = {
            team: data.team,
            comp: data.comp,
            round: data.round
        };
    } else {
        state = {
            team: '',
            comp: data.comp,
            round: data.round
        };
    }
    
    const title = `MinuteBots Scouting - Team ${data.team} - Round ${data.round}`;
        let url;

let date = (await encodeData(Date.now())).substring(0, 8)

if (data.team) {
        url = `${location.origin}${location.pathname}?team=${data.team}&comp=${data.comp}&round=${data.round}&c=${date}`;
} else {
    url = `${location.origin}${location.pathname}?comp=${data.comp}&round=${data.round}&c=${date}`;
}

    if (replace) {
        history.replaceState(state, title, url);
    } else {
        history.pushState(state, title, url);
    }
};

const setTeam = (team) => {
    currentTeam = team;
}

const getTeam = () => {
    return currentTeam;
}

const setMatch = (team, comp, round) => {
    team && setTeam(team);

    if (comp) {
        document.getElementById('comp').value = comp;
    }
    
    if (round) {
        document.getElementById('round').value = round;
    }

    console.log('set match', team, comp, round);

    document.getElementById('teams').value = getMatch();
}

const getMatch = () => {
    return [getTeam(), document.getElementById('comp').value, document.getElementById('round').value].join(',');
}

// false ? prepopulateTeams: null;

// const refreshTeams = async (team = false) => {
//     return ''
//     const teams = document.getElementById('teams');
//     const selectedTeam = teams.selectedIndex >= 0 ? teams.options[teams.selectedIndex].value : null
//     const match = getMatch().split(',');
//     const teamNumbers = await dbClient.getMatchKeys(match[1], match[2]) || [];
//     let newSelect = document.createElement('select');

//     newSelect.setAttribute('id', 'teams')
//     {
//         let selectOption = document.createElement('option');
//         selectOption.value = 'select';
//         selectOption.selected = true;
//         selectOption.textContent = "Select team ...";
//         newSelect.add(selectOption);

//         let newOption = document.createElement('option');
//         newOption.value = 'new';
//         newOption.textContent = "New team ...";
//         newSelect.add(newOption);
//     }

//     for (const team of teamNumbers) {
//         let teamOption = document.createElement('option');
//         teamOption.value = team;
//         teamOption.textContent = team[0];
//         if (team === selectedTeam) {
//             teamOption.selected = true;
//         }
//         newSelect.appendChild(teamOption);
//     }

//     teams.replaceWith(newSelect);
//     teams.value = getMatch();
// }


const onLoad = async () => {
    const cons = ['Amp', 'Close Speaker Shot', 'Far Speaker Shot'];

    for (let {table, count} of [{table:'auto', count: 3}, {table: 'teleop', count: 3}]) {
        const catItems = document.querySelector(`[data-sec=${table}]`).querySelectorAll('tr');

        for (let i = 0; i < count; i++) {
            for (let j = 0; j < 3; j++) {
                const th = document.createElement('th');

                if (j === 0) {
                    th.textContent = cons[i];
                    th.style.textAlign = 'center'
                } else {
                    const minus = document.createElement('button');
                    const plus = document.createElement('button');
                    const input = document.createElement('input');
                    input.classList.add('number', 'input');
                    input.type = 'text';
                    input.style.width = '50px';

                    minus.textContent = '-';
                    minus.classList.add('incr');

                    plus.textContent = '+';
                    plus.classList.add('incr');
                    plus.style.marginRight = '30px';

                    plus.addEventListener('click', async () => {
                        if ((parseInt(input.value) || 0) + 1 >= 999) {
                            input.value = 999;
                        } else {
                            input.value = (parseInt(input.value) || 0) + 1;
                        }

                        await sync();
                    });

                    minus.addEventListener('click', async () => {
                        if ((parseInt(input.value) || 0) - 1 <= 0) {
                            input.value = '';
                        } else {
                            input.value = (parseInt(input.value) || 0) - 1;
                        }

                        await sync();
                    });

                    th.appendChild(minus);
                    th.appendChild(input);
                    th.appendChild(plus);

                    const cat = catItems[j].className;

                    let con;
                    
                    con = j === 0 ? cons[i]: cons[i].toLowerCase().split(' ').slice(0).join('');

                    input.setAttribute('id', [table, cat, con].join('-'));
                    input.classList.add('table-input');
                }

                catItems[j].appendChild(th);
            }
        }
    }
}

const openModal = (id) => {
    id = id.id ? id.id: id;
    const modal = document.getElementById(id);

    modal.style.display = 'block';
}

const closeModal = (id) => {
	if (typeof id === 'string' || id.id) {
		id = id.id ? id.id: id;
		const modal = document.getElementById(id);

        console.log(id)
        if (modal?.classList?.contains('modal') && id !== 'service-error') {
            modal.style.display = 'none';
        }
	} else {
		Array.from(document.getElementsByClassName('modal')).forEach((modal) => {
			modal.style.display = 'none';
		});
	}
}

// false ? refreshTeams: null;

const prepopulateTeams = async (match = 1, comp = "grandforks", station = undefined, tournament = 'qualification') => {
    try {
        if (comp && tournament && (comp.replace('-', '') === "grandforks" || comp.replace('-', '') === "granitecity")) {
            let jsonFilePath = `./assets/${comp.replace('-', '')}-2024-${tournament.toLowerCase()}.json`
            let arrayOfMatches = await fetch(jsonFilePath) 
                .then((res) => { 
                    return res.json();
                }).catch((e) => console.warn(e));

            arrayOfMatches = arrayOfMatches.Schedule;

            let filteredMatches = arrayOfMatches.filter(obj => {
                return obj.tournamentLevel === tournament && obj.matchNumber == match;
            })[0].teams;

            let defaultTeam = filteredMatches.filter(team => {
                return station && team.station === station;
            })[0]?.teamNumber;

            defaultTeam ? setTeam(defaultTeam): clearTeam()
            // if (defaultTeam) {
            //     try {
            //     const a = await dbClient.getMatch(defaultTeam);

            //     if (a) {
            //         console.log('a', a)
            //         presentTeamData(a);
            //     }} catch(e) {console.warn(e)}
            // }
            console.log('went past a')
            {
                let new_select = document.createElement('select');
                new_select.setAttribute('id', 'teams');
                new_select.addEventListener('change', switchTeam);

                let select_team_option = document.createElement('option');
                select_team_option.value = 'select';
                select_team_option.textContent = 'select team...'
                select_team_option.selected = true;
                new_select.appendChild(select_team_option);

                for (let matchObject of filteredMatches) {
                    let team_number = matchObject.teamNumber

                    let option = document.createElement('option');
                    option.textContent = team_number
                    option.setAttribute('value', [team_number, comp, match].join(','))

                    option.selected = team_number === defaultTeam
                    team_number === defaultTeam && setMatch(team_number, comp, match)
                    openSection('auto')

                    new_select.appendChild(option);
                }

                document.getElementById('teams').replaceWith(new_select);
            }

            await pushState(scrapeTeamData())
        }
    } catch(e) {console.warn(e)}
}

const popState = async () => {
    loadData();

    console.log('popState called');
}

const loadData = async () => {
    await navigator.serviceWorker.ready;
    dbClient.getMatches().then(async () => {

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

                const match = await dbClient.getMatch(compParam, roundParam, teamParam);

                if (match) { // if match exists
                    console.log('match exists', match);
                    teamData.team = teamParam;

                    teamData = match;
                } else { // if match does not exist
                    console.log('match does not exist', teamParam, compParam, roundParam);
                    teamData = emptyTeam()
                    teamData.team=teamParam
                    teamData.comp=compParam
                    teamData.round=roundParam
                    saveMatch(teamData)
                    // confirm('team ' + teamParam + ' does not exist with match ' + roundParam + ' of the competition ' + compParam)
                }

            } else { // if URL does not have team param
                console.log('has comp and round params', 'comp=' + compParam + ', round=' + roundParam);
            }
        }

        console.log('data presented on load', teamData)

        await presentTeamData(teamData, push);

        const sec = sessionStorage.getItem('sec');
        document.getElementById('tourn-level').value = sessionStorage.getItem('tournament-level') ?? 'Practice';
        document.getElementById('team-default').value = sessionStorage.getItem('station') ?? 'none';
        prepopulateTeams(document.getElementById('round').value, document.getElementById('comp').value, sessionStorage.getItem('station'), sessionStorage.getItem('tournament-level') ?? 'Practice')

        if (sec) {
            openSection(sec);
        } else {
            openSection('auto');
        }
    }).catch(serviceWorkerMissingResponse)
}

const presentTeamData = async (teamData, push=false) => {
    if (teamData) {
        const secs = ['auto', 'teleop', 'post-game'];

        for (const sec of secs) {
            Array.from(document.getElementById(sec).nextElementSibling.getElementsByClassName('input')).forEach((input) => {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0]) && ['fails', 'succeeds'].includes(id[1])) { // auto or teleop table element
                    input.value = teamData?.[id[0]]?.[id[1]]?.[id[2]] ?? '';
                } else { // non-table element
                    const state = input.type === 'checkbox' ? 'checked' ?? false: 'value' ?? '';

                    input[state] = teamData[sec][inputID];
                }
            });
        }
    }

    // await refreshTeams();
    setMatch(teamData.team || '', teamData.comp || 'granite-city', teamData.round || '1');

    if (validTeam(teamData.team)) {
        const selected = `${teamData.team},${teamData.comp},${teamData.round}`;

        document.getElementById('teams').value = selected;
    } else {
        document.getElementById('teams').value = 'select';
    }

    if (push) {
        await pushState(teamData);
    }

    // await refreshTeams()
    if (validTeam(teamData.team)) {
        const selected = `${teamData.team},${teamData.comp},${teamData.round}`;

        document.getElementById('teams').value = selected;
    }  else {
        document.getElementById('teams').value = 'select';
    }

    console.log('presented data: ', teamData)
}

const serviceWorkerMissingResponse = () => {
    location.reload(true)
    document.getElementById('service-error').style.display = 'block';
}

const scrapeTeamData = () => {
    let teamData = emptyTeam();
    const teams = document.getElementById('teams');

    if (teams.selectedIndex < 2) {
        return teamData;
    }

    teamData.team = getTeam();
    teamData.comp = document.getElementById('comp').value;
    teamData.round = document.getElementById('round').value;

    const secs = ['auto', 'teleop', 'post-game'];

    for (const sec of secs) {
        Array.from(document.getElementById(sec).nextElementSibling.getElementsByClassName('input')).forEach((input) => {
            if (input.value || input.checked) {
                const inputID = input.id;
                const id = inputID.split('-');

                if (secs.includes(id[0]) && ['fails', 'succeeds'].includes(id[1])) { // auto or teleop table element
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
    let cameras = await Html5Qrcode.getCameras()
    const camerasscanner = document.getElementById('cameras')
    const options = camerasscanner.querySelectorAll('option')
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
        const data = JSON.parse(text.replace('https://scouting.minutebots.org/?data=', '')).data
        const dataObject = await decodeData(data)
        saveMatch(dataObject).catch(serviceWorkerMissingResponse)
        await pushState(dataObject)
        presentTeamData(dataObject)
        closeScanner()
        console.log('scanned data', dataObject)
    };

    const errorCallback = (error) => {
        // console.log('scanner error', error);
    };

    let framerate = 15;
    
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

const generateQrcode = (teamData, length) => {
    encodeData(teamData).then((data) => {
        document.getElementById('qrcode').textContent = '';

        let qrcodeDataObject = { 'ver': 1, 'data': data }

            new QRCode(document.getElementById('qrcode'), {
                text: `https://scouting.minutebots.org/?data=${JSON.stringify(qrcodeDataObject)}`,
                correctLevel: QRCode.CorrectLevel.Q,
                width: length,
                height: length
            });

        console.log('encoded in a qrcode', `https://scouting.minutebots.org/?data=${JSON.stringify(qrcodeDataObject)}`)
    })
}

const generateTeamQrcode = async () => {
    const match = getMatch().split(',');

    let thing = await dbClient.getMatch(match[1], match[2], match[0])

    if (typeof thing === 'object') {
        generateQrcode(thing,
                    Math.min(innerHeight, innerWidth) - 45,
                    Math.min(innerHeight, innerWidth) - 45);

        openModal('qrcode-div');
    }
}

const generateCSV = async (includeTopRow) => {
    const flattenTeams = async () => {
        let matchList = [];
        const matches = await dbClient.getMatches();

        if (includeTopRow) {
            matchList.push([
                'Team',
                'Alliance',
                'Match',
                'Scouter',
                'Did They Exit the Starting Zone?',

                'Auto-Amp Succeed',
                'Auto-Amp Fail',
                'Teleop-Amp Succeed',
                'Teleop-Amp Fail',

                'Auto-Close Speaker Succeed',
                'Auto-Close Speaker Fail',
                'Teleop-Close Speaker Succeed',
                'Teleop-Close Speaker Fail',

                'Auto-Far Speaker Succeed',
                'Auto-Far Speaker Fail',
                'Teleop-Far Speaker Succeed',
                'Teleop-Far Speaker Fail',
                
                'Could They Climb?',
                'Could They Climb With Others?',
                'Could They Score Trap?',
                'Could They Do Source Intake?',
                'Could They Do Floor Intake?'
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
                match?.auto?.['left-zone'] === true ? '1': '0'
            ].forEach(value => matchIndex.push(`${value}`));

            const cons = ['amp', 'close\ speaker', 'far\ speaker'];
            const sec = ['auto', 'auto', 'teleop', 'teleop', 'teleop'];
            const cats = ['succeeds', 'fails', 'succeeds', 'fails'];

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) {
                    matchIndex.push(match?.[sec[j]]?.[cats[j]]?.[cons[i]] ?? '0');
                }
            }

            [
                match?.teleop?.['source-intake'] === true ? '1': '0',,
                match?.teleop?.['teleop-floor-intake'] === true ? '1': '0',
                match?.teleop?.climb === true ? '1': '0',
                match?.teleop?.['climb-others'] === true ? '1': '0',
                match?.teleop?.trap === true ? '1': '0',
            ].forEach(value => matchIndex.push(`${value}`));


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

const switchMatch = async () => {
    const a = document.getElementById('round').value
    const b = document.getElementById('comp').value
    prepopulateTeams(a, b, document.getElementById('team-default').value, document.getElementById('tourn-level').value)

    if(a && b) {
        await pushState({team: '', round:a, comp:b})
    } else {
        await pushState()
    }

    document.getElementById('teams').value = 'select';

    clearTeam()
    closeSections();
    // refreshTeams();
};

const emptyTeam = () => {
    return JSON.parse(dataObject);
}

const clearTeam = () => {
    currentTeam = '';
    presentTeamData(emptyTeam());
};

const switchTeam = async (event) => {
    console.log('switched')
    let select = event.target.value;
    document.getElementById('team-default').value = 'none'
    sessionStorage.setItem('station', 'none')
    // document.getElementById('tourn-level').value = 'none'

    if (select === 'select') {
        clearTeam();
        closeSections();
    }
    
    else if (select === 'new') {
        const newTeam = prompt('new team');
        
        if (!newTeam) {
            document.getElementById('teams').value = 'select'
        } else {
            if (validTeam(newTeam)) {
                clearTeam()
                let teamData = emptyTeam();

                setTeam(newTeam);

                teamData.team = currentTeam;
                teamData.comp = document.getElementById('comp').value;
                teamData.round = document.getElementById('round').value;

                await saveMatch(teamData);

                // await refreshTeams();

                presentTeamData(teamData, true);
            } else if (newTeam.replace(/\D/g, '') !== newTeam) {
                confirm(newTeam + ' - please enter a valid team number');
                document.getElementById('teams').value = 'select'
            } else {
                confirm(newTeam + ' is not a valid team number');
                document.getElementById('teams').value = 'select'
            }
        }
    } else if (select !== '') {
        let splitMatch = select.split(',');
        let [team, comp, round] = splitMatch;
        setTeam(team);

        const teamData = await dbClient.getMatch(comp, round, team);
        if (teamData) {
            presentTeamData(teamData, true);
        } else {
            saveMatch(scrapeTeamData())
            sync()
        }
    }

    openSection('auto');
}

const downloadCSV = (includeTopRow = false) => {
    const date = new Date();
    const currentDate = [date.getDate(), date.getMonth() + 1, date.getFullYear()].join('-') + 
                        ', ' + `${date.getHours()}.` + `${date.getMinutes()}.` + date.getSeconds();

    const fileName = 'teams ' + currentDate + '.csv';

    download(generateCSV(includeTopRow), fileName);
}

const closeSections = (saveSec = '') => {
    const sections = document.getElementsByClassName('collapsible');

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
    const section = document.getElementById(id);

    closeSections(id);

    if (getTeam()) {
        section.classList.remove("inactive");
        section.classList.add("active");
        section.nextElementSibling.style.display = "block";
    }
}

const sync = async () => {
    let teamData = scrapeTeamData();
    teamData.team = `${teamData.team}`

    if (teamData.team.length > 2) {
        console.log('sunc', teamData)
        await saveMatch(teamData);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('load', () => loadData().then(document.getElementById('load-block').style.display = 'none'));
    window.addEventListener('popstate', () => popState().then(document.getElementById('load-block').style.display = 'none'));

    onLoad()

    document.getElementById('minus-button').addEventListener('click', async () => {
        const new_value = Math.max(parseInt(document.getElementById('round').value) - 1, 1);
        document.getElementById('round').value = new_value;

        await switchMatch();
        await sync();
    });

    document.getElementById('plus-button').addEventListener('click', async () => {
        const new_value = Math.min(parseInt(document.getElementById('round').value) + 1, 90);
        document.getElementById('round').value = new_value;

        await switchMatch();
        await sync();
    });

    document.getElementById('round').addEventListener('change', async () => {
        let new_value = parseInt(document.getElementById('round').value);
        new_value = isNaN(new_value) ? 0: new_value;
        new_value = Math.min(Math.max(Math.floor(new_value), 1), 90)
        document.getElementById('round').value = new_value;

        await switchMatch();
        await sync();
    });

    document.querySelectorAll('#tourn-level, #team-default').forEach((input) => {
        input.addEventListener('change', () => {
            let match = document.getElementById('round').value;
            let comp = document.getElementById('comp').value;
            let station = document.getElementById('team-default').value;
            let tournamentLevel = document.getElementById('tourn-level').value;
            clearTeam()

            sessionStorage.setItem('station', station)
            sessionStorage.setItem('tournament-level', tournamentLevel)

            if (match && comp && tournamentLevel) {
                prepopulateTeams(match, comp, station ?? undefined, tournamentLevel);
            } else {
                clearTeam();
            }
        });
    });

    document.getElementById('scan-button').addEventListener('click', () => beginScan());
    document.getElementById('download-csv').addEventListener('click', () => downloadCSV(false))

    document.getElementById('comp').addEventListener('change', switchMatch);
    document.getElementById('teams').addEventListener('change', switchTeam);

    Array.from(document.getElementsByClassName('collapsible')).forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id));
    });

    Array.from(document.getElementsByClassName('input')).forEach((input) => {
        input.addEventListener('input', sync);
    });

    window.addEventListener('pointerdown', (event) => closeModal(event.target.id));

    Array.from(document.getElementsByClassName('close-modal')).forEach((item) => {
        item.addEventListener('click', closeModal);
    });

    document.getElementById('generate-qrcode').addEventListener('click', generateTeamQrcode)
    document.getElementById('cameras').addEventListener('change', () => {
        closeScanner();
        const id = document.getElementById('cameras').value || ''
        beginScan(id)
    })

    document.getElementById('warning-label').innerHTML = `<b><u>WARNING!!</u></b><br><br>
    <u>The site could not access the Service Worker (data handler)</u><br><br>
    DO NOT TRY TO SCOUT IF THIS WARNING APPEARS WHEN THE SITE LOADS<br><br>
    <b><u>Please try to reload</u></b>, or open a new tab if reloading does not work.`

    document.querySelectorAll('input[type="text"]:not(#round)').forEach( (input) => {
        input.addEventListener('input', (event) => formatNumber(event));

        input.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '');
        });

        input.placeholder = '0';
        input.min = '0';
    });

    document.getElementById('close-scanner').addEventListener('click', closeScanner);
});

window.beginScan = beginScan;
window.closeScanner = closeScanner;
window.closeSections = closeSections;
window.decodeData = decodeData;
window.download = download;
window.downloadCSV = downloadCSV;
window.emptyTeam = emptyTeam;
window.encodeData = encodeData;
window.generateCSV = generateCSV;
window.generateQrcode = generateQrcode;
window.getMatch = getMatch;
window.getTeam = getTeam;
window.loadData = loadData;
window.onLoad = onLoad;
window.openModal = openModal;
window.openSection = openSection;
window.prepopulateTeams = prepopulateTeams;
window.presentTeamData = presentTeamData;
// window.refreshTeams = refreshTeams;
window.saveMatch = saveMatch;
window.scrapeTeamData = scrapeTeamData;
window.setMatch = setMatch;
window.toggleQRCode = toggleQRCode;

window.dbClient = dbClient;
