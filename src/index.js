/**
 * Demo for Logo interpreter in ES2017.
 * See `readme.md` for details.
 *
 * @file index.js
 * @author Brion Vibber <brion@pobox.com>
 * @license ISC
 */

import {Interpreter, List} from './logo.js';
import {TurtleGraphics} from './turtle.js';

let el = document.getElementById('logo-display');
let elConsole = document.getElementById('logo-console');
let elDebug = document.getElementById('logo-debug');
let elInput = document.getElementById('logo-input');
let elRun = document.getElementById('logo-run');
let elStop = document.getElementById('logo-stop');

let turtle = new TurtleGraphics(el, 640, 480);
let logo = new Interpreter();

function print(className, str) {
    let div = document.createElement('div');
    div.className = className;
    let text = document.createTextNode(str);
    div.appendChild(text);
    elConsole.appendChild(div);
    elConsole.scrollTop = div.offsetTop;
}

elRun.addEventListener('click', function(event) {
    let source = elInput.value;
    elRun.disabled = true;
    elInput.disabled = true;
    elStop.disabled = false;
    print('input', source);
    logo.execute(source)
        .then(() => {
            elInput.disabled = false;
            elRun.disabled = false;
            elStop.disabled = true;
        }).catch((e) => {
            console.log(e);
            print('error', e);
            elInput.disabled = false;
            elRun.disabled = false;
            elStop.disabled = true;
        });
});

elStop.addEventListener('click', function(event) {
    // This will cause an exception to throw
    // on the original promise.
    logo.break();
});

let api = {
    // Rebind 'print'
    print: async function(arg, ...args) {
        args.unshift(arg);
        // @fixme correctly flatten any lists
        let str = args.join(' ');

        print('output', str);
    },

    // Turtle commands
    cs: async function() {
        turtle.clearScreen();
    },
    xcor: async function() {
        return turtle.x;
    },
    ycor: async function() {
        return turtle.y;
    },
    pos: async function() {
        return List.of(turtle.x, turtle.y);
    },
    setpos: async function(list) {
        if (!(list instanceof List)) {
            throw new TypeError('list must be a list');
        }
        if (list.isEmpty() || list.tail.isEmpty()) {
            throw new TypeError('list must have two elements');
        }
        let x = Number(list.head);
        let y = Number(list.tail.head);
        turtle.setPos(x, y);
    },
    heading: async function() {
        return turtle.heading;
    },
    seth: async function(val) {
        turtle.heading = Number(val);
    },
    forward: async function(dist) {
        turtle.forward(+dist);
    },
    back: async function(dist) {
        turtle.back(+dist);
    },
    right: async function(deg) {
        turtle.right(+deg);
    },
    left: async function(deg) {
        turtle.left(+deg);
    },
    up: async function() {
        turtle.up();
    },
    down: async function() {
        turtle.down();
    },
    color: async function(color) {
        turtle.color('' + color);
    },
};
logo.globalScope.bindValues(api);
logo.oncall = async function(func, args, body, node) {
    // warning: template command calls won't have a body/node currently

    updateBody(body, node);

    await new Promise((resolve, reject) => {
        let id = setTimeout(() => {
            logo.onbreak = null;
            resolve();
        }, 100);
        logo.onbreak = (reason) => {
            clearTimeout(id);
            reject(reason);
        };
    });
};

function node2html(node, map) {
    let span = document.createElement('span');
    let val = node.head;
    if (val instanceof List) {
        span.className = 'list';
        span.appendChild(document.createTextNode('['));
        let first = true;
        for (let item of val.cursors()) {
            if (first) {
                first = false;
            } else {
                span.appendChild(document.createTextNode(' '));
            }
            span.appendChild(node2html(item, map));
        }
        span.appendChild(document.createTextNode(']'));
    } else {
        span.appendChild(document.createTextNode(String(val)));
    }
    map.set(node, span);
    return span;
}
let nodeMap = new Map();
let bodyNode = undefined;
function updateBody(body, node) {
    if (body !== bodyNode) {
        elDebug.innerHTML = '';
        elDebug.appendChild(node2html(new List(body), nodeMap));
    }
    let span = nodeMap.get(node);
    if (span) {
        span.className = 'active';
    }
}

elRun.click();
