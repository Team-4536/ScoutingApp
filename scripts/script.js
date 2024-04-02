'use strict';

import { DBClient } from '../app-client.js';
import { stringify } from "./csv-stringify.js";
import { beginScan, closeScanner } from "../bundles/qr-scan.bundle.js";

const dbClient = new DBClient();
let currentTeam;

const dataObject = JSON.stringify({
    'comp': '',
    'round': '',
    'team': '',
    'scouter': '',
    'alliance-role': '',
    'tournament-level': '',

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

        // let key = [data.team, data.comp, data.round, data['tourn-round']].join(',')
        // let a = [localStorage.getItem('team')];
        // a = localStorage.getItem('team') ? []: a
        // if ( !a ) { a = [] };
        // a.push(key)
        // if ([1, 2].includes(a.length) || a.split(' - ').includes(key)) {localStorage.setItem('team', a.join(' - ')) }
    }
};

const throwError = (...logs) => {
    try {
        console.log(...logs)
        document.getElementById('a').style
    } catch(e) {console.error(e)}
}

const pushState = async (data, replace = false) => {
    let state;

    if (data.comp && data.round) {
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
    }
};

const setTeam = (team) => {
    currentTeam = team;
}

const getTeam = () => {
    return currentTeam;
}

const setMatch = (team, comp, round) => {
    team=`${team}`
    team && setTeam(team);

    if (comp) {
        document.getElementById('comp').value = comp;
    }
    
    if (round) {
        document.getElementById('round').value = round;
    }

    // console.log('set match', team, comp, round);

    document.getElementById('teams').value = getMatch();
    // console.log(document.getElementById('a').style)
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

    let scout = localStorage.getItem('scout') || 'none'

    if (scout === 'none') {
        localStorage.setItem('none')
    }        

    document.getElementById('scouter').textContent = scout
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

        // console.log('close modal id', id)
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

const prepopulateTeams = async (match = 1, comp = "grandforks", station = undefined, tournament = 'qualification', sect=undefined) => {
    const cMatch = getMatch()
    if (station === 'none') {
        clearTeam()
    }
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

            if (defaultTeam) {
                setTeam(defaultTeam)
            }

            {
                let new_select = document.createElement('select');
                new_select.setAttribute('id', 'teams');
                new_select.addEventListener('change', switchTeam);

                let select_team_option = document.createElement('option');
                select_team_option.value = 'select';
                select_team_option.textContent = 'Select Team...'
                select_team_option.selected = true;
                new_select.appendChild(select_team_option);

                let new_team_option = document.createElement('option');
                new_team_option.value = 'new';
                new_team_option.textContent = 'Add New Team...'
                new_team_option.selected = false;
                new_select.appendChild(new_team_option);

                for (let matchObject of filteredMatches) {
                    let team_number = matchObject.teamNumber

                    let option = document.createElement('option');
                    option.textContent = team_number
                    option.setAttribute('value', [team_number, comp, match].join(','))
                    if (sect) {
                        openSection(sect)
                    } else {
                        if(cMatch !== [team_number, comp, match].join(',') ){ openSection('auto')}
                    }

                    option.selected = team_number === defaultTeam
                    team_number === defaultTeam && setMatch(team_number, comp, match)

                    new_select.appendChild(option);
                }

                document.getElementById('teams').replaceWith(new_select);
            }

            if (defaultTeam) {
                let a
                a = await dbClient.getMatch(document.getElementById('comp').value, `${document.getElementById('round').value}`, `${defaultTeam}`);
    
                if (a) {
                    presentTeamData(a, false, false);
                } else {
                    let data = emptyTeam()
                    data.team = `${defaultTeam}`
                    data.comp = document.getElementById('comp').value
                    data.round = document.getElementById('round').value

                    presentTeamData(data)
                }
            }
    
            await pushState(scrapeTeamData())
        }
    } catch(e) {console.warn(e)}

    throwError()
}

const popState = async () => {
    loadData();

    console.log('popState called');
}

const loadData = async () => {
    try {
    await navigator.serviceWorker.ready;
    (dbClient.getMatches().then(async () => {

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
                saveMatch(data)
                presentTeamData(data)
                setMatch(data.team, data.comp, data.match)

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

        if (sec) {
            prepopulateTeams(document.getElementById('round').value, document.getElementById('comp').value, sessionStorage.getItem('station'), sessionStorage.getItem('tournament-level') ?? 'Practice', sec)
        } else {
            prepopulateTeams(document.getElementById('round').value, document.getElementById('comp').value, sessionStorage.getItem('station'), sessionStorage.getItem('tournament-level') ?? 'Practice')
        }
    }).catch(serviceWorkerMissingResponse))
} catch {
    document.getElementById('load-block').style.display='block'
}
document.getElementById('load-block').style.display='none'
}

const presentTeamData = async (teamData, push=false, excludePreGame=false, preserveMatch = false) => {
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
    if (!excludePreGame) {
        setMatch(teamData.team || '', teamData.comp || 'granite-city', teamData.round || (preserveMatch ? document.getElementById('round').value: '1'));

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
    } 

    console.log('presented data: ', teamData)
}

const serviceWorkerMissingResponse = () => {
    location.reload(true)
    // document.getElementById('service-error').style.display = 'block';
    document.getElementById('load-block').style.display = 'block';
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
    teamData.scouter = document.getElementById('scouter').textContent;
    teamData['tournament-level'] = document.getElementById('tourn-level').value;
    teamData['alliance-role'] = document.getElementById('team-default').value.replace('1', ' 1').replace('2', ' 2').replace('3', ' 3');

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

        // console.log('encoded in a qrcode', `https://scouting.minutebots.org/?data=${JSON.stringify(qrcodeDataObject)}`)
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
        let matches = await dbClient.getMatches();
        let statey = document.getElementById('download-opts').value

        if (statey === '1') {
            let round = document.getElementById('round').value
            let tournL = document.getElementById('tourn-level').value

            matches = matches.filter(obj => {
                return obj.round === round && obj['tournament-level'] === tournL
            })
        } else if (statey === '2') {
            matches = matches.filter(obj => {
                return true;

                return // code (:
            })
        }

        if (includeTopRow) {
            matchList.push([
                'Team',
                'Alliance Role',
                'Tournament Level',
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
                'Could They Do Floor Intake In Auto?',
                'Could They Do Floor Intake In Teleop?',
                'Could They Do Source Intake?',

                'Did They Use Defense?',
                'Were They Forced To Use Defense?',
                'Did They Break Or Loose A Part?',
                'Did They Disable Or Stop Moving?',
                'Comments'
            ]);
        } else {
            matchList.push([]);
        }

        for (let match of matches.entries()) {
            match = match[1];
            const matchIndex = [];
            
            [
                match?.team ?? 'N/A',
                match?.['alliance-role'] ?? 'N/A',
                match?.['tournament-level'] ?? 'N/A',
                match?.round ?? 'N/A',
                match?.scouter ?? 'N/A',
                match?.auto?.['left-zone'] === true ? '1': '0'
            ].forEach(value => matchIndex.push(`${value}`));

            const cons = ['amp', 'closespeakershot', 'farspeakershot'];
            const sec = ['auto', 'auto', 'teleop', 'teleop', 'teleop'];
            const cats = ['succeeds', 'fails', 'succeeds', 'fails'];

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) {
                    matchIndex.push(match?.[sec[j]]?.[cats[j]]?.[cons[i]] ?? '0');
                }
            }

            [
                match?.teleop?.climb === true ? '1': '0',
                match?.teleop?.['climb-others'] === true ? '1': '0',
                match?.teleop?.trap === true ? '1': '0',
                match?.teleop?.['auto-floor-intake'] === true ? '1': '0',
                match?.teleop?.['teleop-floor-intake'] === true ? '1': '0',
                match?.teleop?.['source-intake'] === true ? '1': '0',

                match?.['post-game']?.defense === true ? '1': '0',
                match?.['post-game']?.['forced-defense'] === true ? '1': '0',
                match?.['post-game']?.break === true ? '1': '0',
                match?.['post-game']?.disable === true ? '1': '0',
                (match?.['post-game']?.comments ?? 'N/A') || 'None'
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

    let team

    try {
        team = await dbClient.getMatch(currentTeam, b, a);
    } catch {
        console.warn('Match ' + getMatch() + 'does not exist ):')
    }

    if (team) {
        clearTeam()
        closeSections();    

        presentTeamData(team)
        openSection('auto')
    }
};

const emptyTeam = () => {
    return JSON.parse(dataObject);
}

const clearTeam = () => {
    currentTeam = '';
    presentTeamData(emptyTeam(), false, false, true);
};

const switchTeam = async (event) => {
    // console.log('switched')
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
    const sections = Array.from(document.getElementsByClassName('collapsible'));

    for (let s of sections.filter(secti => secti.id !== saveSec)) {
        s.classList.remove('active');
        s.classList.add('inactive');
        s.nextElementSibling.style.display = 'none';
    }

    sessionStorage.setItem('sec', '');
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

const openSection = (id, target) => {
    const section = document.getElementById(id);

    closeSections(id);

    if ((!(target?.classList?.contains('active')) || target?.classList?.contains('inactive')) && getTeam()) {
        section.classList.remove("inactive");
        section.classList.add("active");
        section.nextElementSibling.style.display = "block";
    } else {
        closeSections()
    }
}

const sync = async () => {
    let teamData = scrapeTeamData();
    teamData.team = `${teamData.team}`

    if (teamData.team.length > 2) {
        // console.log('sunc', teamData)
        await saveMatch(teamData);
    }
};

const callScout = () => {
    let a = prompt('Scouter Name:');

    if (a && /[1-9a-zA-Z]/g.test(a)) {
        document.getElementById('scouter').textContent = a;
        localStorage.setItem('scout', a)
    } else if (a !== null && a !== '') {
        alert('scouter name must include at least one letter or number in it.')
        callScout()
    }

    sync()
}

const pageInit = async () => {
    window.addEventListener('popstate', popState);

    onLoad();

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
    document.getElementById('download-csv').addEventListener('click', () => {downloadCSV(true)})

    document.getElementById('comp').addEventListener('change', switchMatch);
    document.getElementById('teams').addEventListener('change', switchTeam);

    Array.from(document.getElementsByClassName('collapsible')).forEach((input) => {
        input.addEventListener("click", (event) => openSection(event.target.id, event.target));
    });

    Array.from(document.getElementsByClassName('input')).forEach((input) => {
        input.addEventListener('input', sync);
    });

    window.addEventListener('pointerdown', (event) => closeModal(event.target.id));

    Array.from(document.getElementsByClassName('close-modal')).forEach((item) => {
        item.addEventListener('click', closeModal);
    });

    document.getElementById('generate-qrcode').addEventListener('click', generateTeamQrcode)
    document.getElementById('edit-scouter').addEventListener('click', () => {
        callScout()
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

    if (document.readyState == "complete") {
        console.log("calling loadData");
        loadData();
    } else {
        console.log("adding loadData event listener");
        window.addEventListener('load', loadData);
    }
}

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
window.sync = sync;
window.toggleQRCode = toggleQRCode;

window.dbClient = dbClient;

if (document.readyState != "loading") {
    console.log("content is already loaded");
    pageInit();
} else {
    console.log("adding page event listener");
    document.addEventListener('DOMContentLoaded', pageInit);
}
