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

async function reloadTeams() {
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
}

async function onLoad() {
    toggleSectionCollapse('auto');

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
                    history.pushState(null, null, location.origin + location.pathname + '?team=' + team);
                    dbClient.putTeam(data);
                }
            } else {
                // Add visable error message
            }
        }
    } else {
        fillTeamData(JSON.parse(dataObject));
    }

    reloadTeams();
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

// function dataObject() {
//     const teamData = {
//         'team': '',
//         'auto': {
//             'left-zone': null,
//             'a-stop': null,
//             'a-reason': '',
//             'succeed': {},
//             'fail': {},
//             'method': {}
//         },
//         'teleop': {
//             'e-stop': null,
//             'e-reason': '',
//             'succeed': {},
//             'fail': {},
//             'method': {}
//         }
//     }

//     return teamData;
// }

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

// function clearTeamData(team = '') {
//     var con = ['succeed', 'fail', 'method'];
//     var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

//     getElem('team', 'id').value = '';
//     getElem('left-zone', 'id').checked = '';
//     getElem('a-stop', 'id').checked = '';
//     getElem('a-reason', 'id').value = '';
//     getElem('e-stop', 'id').checked = '';
//     getElem('e-reason', 'id').value = '';
    
//     for (let a = 0; a < 3; a++) {
//         for (let b = 0; b < 3; b++) {
//             try {
//                 getElem(`auto-${con[a]}-${cat[b]}`, 'id').value = '';
//             } catch (error) {
//                 console.error(`Error retrieving 'teamData.auto.${con[a]}.${cat[b]}': "${error}"`);
//             }
//         }
//     }

//     for (let c = 0; c < 3; c++) {
//         for (let d = 0; d < 6; d++) {
//             try {
//                 getElem(`teleop-${con[c]}-${cat[d]}`, 'id').value = '';
//             }
//             catch (error) {
//                 console.error(`Error retrieving 'teamData.teleop.${con[c]}.${cat[d]}': "${error}"`);
//             }
//         }
//     }

//     if (team) {
//         const teams = getElem('teams', 'id');

//         for (const option in getElem('option:not(:first-child)', 'queryAll', teams)) {
//             if (option == team) {
//                 teams.value == team

//                 break;
//             } else {
//                 teamData = dataObject(team);

//                 dbClient.putTeam(teamData);
//                 reloadTeams();

//                 break;
//             }
//         }
//     }
// }

async function encodeData(data) {
    const teamData = fillDataObject();
    const stream = new Blob([JSON.stringify(teamData)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream('gzip'));
    const blob = await new Response(compressedReadableStream).blob();

    const ab = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(ab)));
}

function fillTeamData(teamData) {
    fillDataObject();

    var con = ['succeed', 'fail', 'method'];
    var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    if (teamData) {
        getElem('team', 'id').value = teamData.team || '';
        getElem('teams', 'id').value = teamData.team || '';
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

    aStop();
    eStop();
}

export { dataObject, numInputs, getElem, fillTeamData, fillDataObject, encodeData, decodeData, onLoad, aStop, eStop, toggleSectionCollapse, reloadTeams };