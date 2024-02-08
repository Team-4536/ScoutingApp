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

function dataObject() {
    const teamData = {
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
    }

    return teamData;
}

function fillDataObject() {
    var teamData = dataObject();

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