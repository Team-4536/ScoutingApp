"use strict";

const consoleContainer = document.getElementById('console-container');
const consoleInput = document.getElementById('console-input');
const consoleOutput = document.getElementById('console-output');

let commandHistory = JSON.parse(localStorage.getItem('commandHistory')) || [];
let historyIndex = commandHistory.length;

let consoleKey = {
    ctrlKey: false,
    altKey: true,
    shiftKey: true,
    keys: ['`'],
};

// (function () {
//     const consolelog = console.log;

//     console.log = function (...args) {
//         const message = args.map(arg => {
//             return typeof arg === 'object' ? JSON.stringify(arg) : arg;
//         }).join(' ');
//         consolelog(message);
//         log(message);
//     };
// })();

function setConsoleKey(...args) {
    consoleKey.ctrlKey = false;
    consoleKey.altKey = false;
    consoleKey.shiftKey = false;
    consoleKey.keys = [];

    args.forEach(function(arg) {
        arg = arg.toLowerCase();

        if (typeof arg === 'string') {
            if (arg === 'ctrl' || arg == 'control') {
                consoleKey.ctrlKey = true;
            } else if (arg === 'alt' || arg === 'option') {
                consoleKey.altKey = true;
            } else if (arg === 'shift') {
                consoleKey.shiftKey = true;
            } else {
                consoleKey.keys.push(arg);
            }
        }
    });
}

function log(text, type) {
    var color;
    switch (type) {
        case 'command':
            color = 'black';
            break;
        case 'error':
            color = 'red';
            break;
        case 'output':
            color = 'grey';
            text = '&nbsp;&nbsp;' + text;
            break;
        default:
            color = 'black';
            break;
    }
    consoleOutput.innerHTML += '<span style="color: ' + color + ';">' + text + '</span><br>';
    while (consoleOutput.children.length > 100) {
        consoleOutput.removeChild(consoleOutput.children[0]);
    }
}

function toggleConsole() {
    if (consoleContainer.style.display === 'none') {
        consoleContainer.style.display = 'block';
        consoleInput.style.display = 'block';
        consoleInput.focus();
    } else {
        consoleContainer.style.display = 'none';
        consoleInput.style.display = 'none';
    }
}

function openConsole (event) {
    if (consoleKey.keys.includes(event.key) &&
        event.ctrlKey === consoleKey.ctrlKey &&
        event.altKey === consoleKey.altKey &&
        event.shiftKey === consoleKey.shiftKey) {
        event.preventDefault();
        toggleConsole();
    }
}

function keyDown(event) {
    if (event.key === 'Enter') {
        var command = event.target.value.trim();
        log('> ' + command, 'command');
        commandHistory.push(command);
        localStorage.setItem('commandHistory', JSON.stringify(commandHistory));
        try {
            var result = eval(command);
            log(result, 'output');
        } catch (error) {
            log(error.message, 'error');
        }
        event.target.value = '';
    } else if (event.key === 'ArrowUp') {
        if (historyIndex > 0) {
            historyIndex--;
            event.target.value = commandHistory[historyIndex] ?? '';
        }
    } else if (event.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length) {
            historyIndex++;
            event.target.value = commandHistory[historyIndex] || '';
        }
    }
}

function getConsoleKey() {
    const keys = [];

    consoleKey.ctrlKey && keys.push('Ctrl');
    consoleKey.altKey && keys.push('Alt');
    consoleKey.shiftKey && keys.push('Shift');

    consoleKey.keys.forEach(function(key) {
        if (typeof key === 'string') {
            keys.push(key);
        }
    });

    log(keys.join(' + '));
}

function clearHistory() {
    localStorage.removeItem('commandHistory');
    commandHistory = [];
    log('Command history cleared.', 'output');
}

function closeConsole() {
    toggleConsole();
}

function clearConsole() {
    consoleOutput.innerHTML = '';
}

document.addEventListener('keydown', function(event) { openConsole(event) });
consoleInput.addEventListener('keydown', function(event) { keyDown(event) });

toggleConsole();
