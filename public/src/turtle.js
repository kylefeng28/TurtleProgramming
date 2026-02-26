'use strict';

// TODO use async/await
// instead of a PromiseWrapper
// make each command await the promise returned by the last command

let PromiseWrapper = function(promise) {
	// TODO wrap in a Proxy?
	// Wrap promise in a plain object, with the result attached
	// TODO use async/await?
	this.promise = promise;
	this.value = undefined;
	this.valueOf = () => this.value;
	promise.then((result) => {
		this.value = result;
	});

	// TODO proxy function calls

	// Calls fn on the wrapped value
	this.call = (fn) => new PromiseWrapper(promise.then((val) => {
		return fn(val);
	}));

	this.add = (arg) => new PromiseWrapper(promise.then((val) => (val + arg)));
	this.sub = (arg) => new PromiseWrapper(promise.then((val) => (val - arg)));
	this.mul = (arg) => new PromiseWrapper(promise.then((val) => (val * arg)));
	this.div = (arg) => new PromiseWrapper(promise.then((val) => (val / arg)));
};


/* class Turtle */
/*
 * Coordinates follow the Cartesian convention (right-hand rule?):
 * x: positive is right, negative is left
 * y: positive is up, negative is down
 * ang: positive is counterclockwise, negative is clockwise
 *
 * ang is in degrees, not radians
 */
let Turtle = function() {
	// Position and heading
	this._x = 0;
	this._y = 0;
	this._x_new = this._x;
	this._y_new = this._y;
	this._ang = 90;
	this._ang_new = this._ang;

	// Attributes
	this._color = 255; // white
	this._width = 1;

	// Appearance
	this._isVisible = true;
	this._isPenDown = true;

	// Animation
	this._scale = 10; // tweening speed

	// Backend
	this._stateStack = []; // stack of states
	this._commandQueue = []; // queue of commands
	this._commandFinished = true;
	this._vertices = []; // list of vertices

	// Cloning
	this._clones = []; // list of clones
	this._parent = null; // parent of clone
};

Turtle.prototype._addCommand = function(cmd, args) {
	// Create a promise, and resolve/reject it in _executeNextCommand()
	let resolve, reject;
	let p = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject; });
	// Add command to end of queue (beginning of array)
	this._commandQueue.unshift({ cmd, args, resolve, reject });
	// Return wrapped promise
	return new PromiseWrapper(p);
};

// TODO add promises
Turtle.prototype._addCommand_ = function(cmd, args) {
	// Create a promise, and resolve/reject it in _executeNextCommand()
	let resolve, reject;
	let p = new Promise((_resolve, _reject) => { [ resolve, reject ] = [ _resolve, _reject ]; });

	// If command is not finished, pop from the queue
	// and make it appear that it reached its destination
	if (!this._commandFinished) {
		this._commandQueue.pop();
		this._x_new = this._x;
		this._y_new = this._y;
		this._ang_new = this._ang;
		// this._commandFinished = true; // extraneous

		// Modify the last line drawn
		console.log("Before: " + this._vertices);
		let lastVertex = this._vertices.pop();
		if (lastVertex.type === 'point') {
			lastVertex.to = [ this._x, this._y ];
		}
		this._vertices.push(lastVertex);
		console.log("After: " + this._vertices);

	}

	// Add command to front of queue (end of array)
	this._commandQueue.push({ cmd, args, resolve, reject });
	// Return wrapped promise
	return new PromiseWrapper(p);
};

Turtle.prototype._addVertex = function() {
	if (this._isPenDown) {
		this._vertices.push({
			type: 'point',
			from: [this._x, this._y],
			to: [this._x_new, this._y_new],
			color: this._color,
			width: this._width
		});
	}
};

Turtle.prototype._addText = function(str) {
	this._vertices.push({
		type: 'text',
		str: str, at: [this._x, this._y],
		color: this._color
	});
};

// Add a placeholder to signify that there is a break between the previous vertex and the next vertex
// (i.e., when using penup, setxy, push, pop)
// This is so a line segment does not erroneously follow the turtle
// TODO: Although this could be a useful feature. Pick up and drop line?
Turtle.prototype._addVoid = function() {
	this._vertices.push({ type: 'void' });
};

// https://www.mathworks.com/help/symbolic/mupad_ref/plot-turtle.html
// Save the current state
Turtle.prototype._pushState = function() {
	this._stateStack.push({
		position: [this._x, this._y],
		angle: this._ang,
		color: this._color,
		width: this._width
	});
};

// Restore the last remembered state and remove it from the list of remembered states
Turtle.prototype._popState = function() {
	let lastState = this._stateStack.pop();
	if (lastState) {
		this._x_new = lastState.position[0];
		this._y_new = lastState.position[1];
		this._ang_new = lastState.angle;
		this._color = lastState.color;
		this._width = lastState.width;
		// console.log(this);
	}
	return lastState;
};

/* Cloning */
Turtle.prototype._clone = function() {
	this._pushState();
	let state = this._popState();
	let newClone = new Turtle();
	newClone._parent = this;
	// TODO this is abusing push/pop so much...
	newClone._stateStack.push(state);
	newClone._popState();
	// TODO probably should refactor these curr = new assignments somewhere...
	newClone._x = newClone._x_new;
	newClone._y = newClone._y_new;
	newClone._ang = newClone._ang_new;

	// Add the clone to the list of clones
	this._clones.push(newClone);
	return newClone;
}

// Get a list containing itself, its clones, and their clones recursively
Turtle.prototype._all = function() {
	// Base case: no clones
	if (this._clones.length === 0) {
		return [ this ];
	}
	// Recursive case
	else {
		let flattened = [ this ];
		this._clones.forEach(function(clone, i) {
			flattened = flattened.concat(clone._all());
		});
		return flattened;
	}
}

// Kill clones
// As a side effect, all clones of the clones are killed as well
Turtle.prototype._killClones = function() {
	while (this._clones.length > 0) { this._clones.pop(); }
}

// Recursively merge clones' vertices, and kill the clones
Turtle.prototype._mergeClones = function() {
	let all = this._all();
	// TODO: add void vertex between the different clones
	let vertices = all.map((clone) => clone._vertices).reduce((a,b) => a.concat(b));
	this._vertices = vertices;
	this.killClones();
}

// Sleep
Turtle.prototype._sleep = function(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Turtle commands */
// Move and draw
Turtle.prototype.forward = function (n) { return this._addCommand('forward', n); };
Turtle.prototype.backward = function (n) { return this._addCommand('backward', n); };
Turtle.prototype.right = function (n) { return this._addCommand('right', n); };
Turtle.prototype.left = function (n) { return this._addCommand('left', n); };
Turtle.prototype.setxy = function(x, y) { return this._addCommand('setxy', [x, y]); }
Turtle.prototype.setheading = function(ang) { return this._addCommand('setheading', ang); }
Turtle.prototype.write = function(str) { return this._addCommand('write', str); }

Turtle.prototype.push = function () { return this._addCommand('push'); };
Turtle.prototype.pop = function () { return this._addCommand('pop'); };

// Drawing state
Turtle.prototype.show = function() { return this._addCommand('show'); }
Turtle.prototype.hide = function() { return this._addCommand('hide'); }
Turtle.prototype.clear = function() { return this._addCommand('clear'); }
Turtle.prototype.pendown = function() { return this._addCommand('pendown'); }
Turtle.prototype.penup = function() { return this._addCommand('penup'); }
Turtle.prototype.color = function(...args) { return this._addCommand('setcolor', args); }
Turtle.prototype.width = function(n) { return this._addCommand('setwidth', n); }

Turtle.prototype.reset = function() { return this._addCommand('reset'); }

// Cloning
Turtle.prototype.clone = function() { return this._addCommand('clone'); }
Turtle.prototype.killClones = function() { return this._addCommand('killClones'); }
Turtle.prototype.mergeClones = function() { return this._addCommand('mergeClones'); }

// Urgent commands
Turtle.prototype['show!'] = function() { return this._addCommand_('show'); }
Turtle.prototype['hide!'] = function() { return this._addCommand_('hide'); }
Turtle.prototype['clear!'] = function() { return this._addCommand_('clear'); }
Turtle.prototype['pendown!'] = function() { return this._addCommand_('pendown'); }
Turtle.prototype['penup!'] = function() { return this._addCommand_('penup'); }
Turtle.prototype['reset!'] = function() { return this._addCommand_('reset'); }
Turtle.prototype['setxy!'] = function(x, y) { return this._addCommand_('setxy', [x, y]); }
Turtle.prototype['setheading!'] = function(x, y) { return this._addCommand_('setheading', [x, y]); }

Turtle.prototype['stop!'] = function() { return this._addCommand_('stop'); }
Turtle.prototype['killClones!'] = function() { return this._addCommand_('killClones'); }

// Aliases
Turtle.prototype.fd = Turtle.prototype.forward;
Turtle.prototype.bk = Turtle.prototype.back = Turtle.prototype.backward;
Turtle.prototype.rt = Turtle.prototype.right;
Turtle.prototype.lt = Turtle.prototype.left;
Turtle.prototype.goto = Turtle.prototype.setxy;
Turtle.prototype.seth = Turtle.prototype.setheading;
Turtle.prototype.up = Turtle.prototype.penup;
Turtle.prototype.down = Turtle.prototype.pendown;

Turtle.prototype['goto!'] = Turtle.prototype['setxy!'];
Turtle.prototype['seth!'] = Turtle.prototype['setheading!'];

// isX -> x?
Object.defineProperty(Turtle.prototype, 'pendown?', { get: function() { return this.isPenDown; } });
Object.defineProperty(Turtle.prototype, 'visible?', { get: function() { return this.isVisible; } });

// Getters
// TODO define dynamically?
// TODO make set call the respective set command?
Object.defineProperty(Turtle.prototype, 'x', { get: function() { return this._addCommand('getx'); } });
Object.defineProperty(Turtle.prototype, 'y', { get: function() { return this._addCommand('gety'); } });
Object.defineProperty(Turtle.prototype, 'ang', { get: function() { return this._addCommand('getheading'); } });
Object.defineProperty(Turtle.prototype, 'color', { get: function() { return this._addCommand('getcolor'); } });
Object.defineProperty(Turtle.prototype, 'width', { get: function() { return this._addCommand('getwidth'); } });
Object.defineProperty(Turtle.prototype, 'isPenDown', { get: function() { return this._addCommand('getIsPenDown'); } });
Object.defineProperty(Turtle.prototype, 'isVisible', { get: function() { return this._addCommand('getVisible'); } });

// TODO: commandHistory, undo

Turtle.prototype._update = function() {
	// If turtle is visible, do all the fancy animation stuff
	if (this._isVisible) {
		// Check if turtle has reached its new position (or close enough to it)
		let x_eq = this._x_new === this._x;
		let y_eq = this._y_new === this._y;
		let ang_eq = Math.abs(this._ang_new - this._ang) < 1;

		// If it has, then execute the next command
		if (x_eq && y_eq && ang_eq) {
			this._ang = this._ang_new;

			this._commandFinished = true;
			this._executeNextCommand();
		}
		// Otherwise move towards new position
		else {
			let diff = new p5.Vector(this._x_new - this._x, this._y_new - this._y);
			let dist = diff.mag();
			let dir = diff.normalize(); // destructive

			// Set them equal to the new values if closer than scale
			if (dist < this._scale) this._x = this._x_new; else this._x += this._scale * dir.x;
			if (dist < this._scale) this._y = this._y_new; else this._y += this._scale * dir.y;

			this._ang = lerp(this._ang, this._ang_new, 0.5);
		}

	}
	// Otherwise just do it the boring way
	else {
		// let n = this._commandQueue.length * this._scale; // while (n--)
		while (this._commandQueue.length > 0) {
			this._executeNextCommand();
			this._x = this._x_new;
			this._y = this._y_new;
			this._ang = this._ang_new;
		}
	}

	// Update clones
	this._clones.forEach(function(clone, i) {
		clone._update();
	})
};

Turtle.prototype._draw = function() {
	// Make relative to origin
	push(); // {
	translate(width/2, height/2);

	// TODO perspective?

	//_ Draw vertices
	// TODO: rename this._vertices
	for (let i = 0; i < this._vertices.length; i++) {
		push(); // {
		let vertex = this._vertices[i];
		if (vertex.type === 'point') {
			stroke(vertex.color);
			strokeWeight(vertex.width);

			let [x1, y1] = vertex.from;
			let x2, y2;

			// Draw only up to the turtle, don't draw ahead
			if (i === this._vertices.length-1 && !this._commandFinished) {
				[x2, y2] = [this._x, this._y];
			} else {
				[x2, y2] = vertex.to;
			}

			line(x1, -y1, x2, -y2);
		}
		else if (vertex.type === 'text') {
			noStroke();
			fill(vertex.color);
			text(vertex.str, vertex.at[0], -vertex.at[1]);
		}
		// ignore void

		pop(); // }
	}

	// Now make relative to turtle
	push(); // {
	translate(this._x, -this._y);
	rotate(-radians(this._ang));

	// Draw turtle
	if (this._isVisible) {
		// stroke(0, 0, 0, 127);
		stroke(this._color, this._color, this._color, 127);
		// noFill();
		fill(this._color);
		// triangle(5, 0, -5, 4, -5, -4);
		quad(5, 0, -5, 4, -3, 0, -5, -4);
		noFill();
	}

	pop(); // }

	pop(); // }

	// Draw clones
	this._clones.forEach(function(clone, i) {
		clone._draw();
	})
};

Turtle.prototype._executeNextCommand = function() {
	// Get next command in command queue
	let command = this._commandQueue.pop();
	if (command) {
		this._commandFinished = false;
		let { cmd, args, resolve, reject } = command;

		// Unwrap promise and pass it on to the next if statement
		if (typeof args === 'object' && args instanceof PromiseWrapper) {
			args = args.valueOf;
		}

		// Unwrap function
		// This is essentially lazy evaluation
		if (typeof args === 'function') {
			args = args();
		}

		switch (cmd) {
			case 'forward':
				if (typeof args !== 'number') { reject(); }
				else {
					logText('Forward ' + args);
					this._x_new = this._x + args * Math.cos(radians(this._ang));
					this._y_new = this._y + args * Math.sin(radians(this._ang));
					this._addVertex();
					resolve();
				}
				break;
			case 'backward':
				if (typeof args !== 'number') { reject(); }
				else {
					logText('Backward ' + args);
					this._x_new = this._x - args * Math.cos(radians(this._ang));
					this._y_new = this._y - args * Math.sin(radians(this._ang));
					this._addVertex();
					resolve();
				}
				break;
			case 'right':
				if (typeof args !== 'number') { reject(); }
				else {
					logText('Right ' + args);
					this._ang_new = (this._ang - args);
					resolve();
				}
				break;
			case 'left':
				if (typeof args !== 'number') { reject(); }
				else {
					logText('Left ' + args);
					this._ang_new = (this._ang + args);
					resolve();
				}
				break;
			case 'setxy':
				logText('Set [x, y] to ' + args);
				this._x_new = args[0];
				this._y_new = args[1];
				this._addVoid();
				resolve();
				break;
			case 'setheading':
				logText('Set heading to ' + args);
				this._ang_new = args;
				resolve();
				break;
			case 'hide':
				logText('Hide');
				this._isVisible = false;
				resolve();
				break;
			case 'show':
				logText('Show');
				this._isVisible = true;
				resolve();
				break;
			case 'clear':
				logText('Clear');
				this._vertices.length = 0;
				resolve();
				break;
			case 'write':
				logText('Write "' + args + '"');
				this._addText(args);
				resolve();
				break;
			case 'push':
				logText('Saving state');
				this._pushState();
				this._addVoid();
				resolve();
				break;
			case 'pop':
				logText('Restoring state');
				this._popState();
				this._addVoid();
				resolve();
				break;
			case 'pendown':
				logText('Pen down');
				this._isPenDown = true;
				resolve();
				break;
			case 'penup':
				logText('Pen up');
				this._isPenDown = false;
				this._addVoid();
				resolve();
				break;
			case 'setcolor':
				logText('Set color to ' + args);
				this._color = color(...args); // wrap using p5.Color
				resolve();
				break;
			case 'setwidth':
				logText('Set width to ' + args);
				this._width = args;
				resolve();
				break;
			case 'reset':
				logText('Reset');

				// clear(); setxy(0, 0); setheading(90);
				this._vertices.length = 0;
				this._ang = this._ang_new = 90;
				this._x = this._y = 0;
				this._x_new = this._y_new = 0;
				resolve();
				break;
			case 'stop':
				logText('Stop');

				// Reset command queue
				// Why doesn't this work? this._commandQueue.length = 0;
				while (this._commandQueue.length > 0) { this._commandQueue.pop(); }
				resolve();
				break;

			// Cloning
			case 'clone':
				logText('Clone');
				let clone = this._clone();
				resolve(clone);
				break;

			case 'killClones':
				logText('Kill clones');
				this._killClones();
				resolve();
				break;

			case 'mergeClones':
				logText('Merge clones');
				this._mergeClones();
				resolve();
				break;

			// Getters
			// TODO: cleanup
			// clones, color, width, parent
			case 'getx': resolve(this._x); break;
			case 'gety': resolve(this._y); break;
			case 'getxy': resolve([this._x, this._y]); break;
			case 'getheading': resolve(this._ang); break;
			case 'getcolor': resolve(this._color); break;
			case 'getwidth': resolve(this._width); break;
			case 'getIsPenDown': resolve(this._isPenDown); break;
			case 'getIsVisible': resolve(this._isVisible); break;

			case 'call':
				// Function is passed as an argument
				let fn = args;
				resolve(fn());
				break;
		}
	}
}

Turtle.prototype._debug = function() {
	if (this.isDebug) {
		let s = '';
		s += 'Position: ' + [this._x, this._y] + '\n';
		s += 'Heading: ' + this._ang + '\n';
		s += 'New position' + [this._x_new, this._y_new] + '\n';
		s += 'New heading' + this._ang_new + '\n';

		text(s, 50, 50); // TODO change coords, fix multiline
	}
};

/******************************************************************************/

// This is the mother of all turtles (MOAT)
let t = new Turtle();
let canvas;
let bgcolor = 0; // 200, 64
let message = '';

// Proxy for all clones
let cloneProxy = new Proxy({}, {
	get: (target, key) => {
		// Output a function
		return (...args) => {
			let all = t._all();
			// Proxy the function call to each clone
			return all.map((clone) => {
				let prop = clone[key];
				if (typeof prop === 'function') {
					clone[key](...args);
				}
			});
		};
	}
	// set?
});

// Set the proxy: either just the MOAT, or all clones
// TODO use a viewmodel for this
let proxy = cloneProxy;
// let proxy = t;

// let sketch = {};
// sketch.setup = function(p) {
function setup(p) {
	canvas = createCanvas(windowWidth, windowHeight);
	background(bgcolor);
	textFont('Helvetica');
	strokeCap(PROJECT);

	t._update();
	t._draw();
}

// sketch.draw = function(p) {
function draw(p) {
	// Redraw only if dirty
	if (!t._commandFinished) {
		// Clear canvas
		background(bgcolor);

		t._draw();
		t._debug();

		// TODO change coords. change to div?
		push(); // {
		stroke(255);
		fill(255);
		strokeWeight(0);
		let m = message;
		if (isMacroRecording) { m = 'Macro recording -- ' + m; }
		text(m, 50, height - 50);
		pop(); // }
	}

	t._update();
}

// Initialize instance mode
// new p5(sketch);

/* Interative etch-a-sketch mode
 * Specify count with number keys (0-9)
 * Move turtle with WASD or hjkl
 *
 * c: clear()
 * r: reset()
 * ,: pendown()
 * .: penup()
 * \: show()/hide()
 */
let countPrefix = 0;
let macro = [];
let macro_old = [];
let isMacroRecording = false;

function parseKey(key) {
	let addToMacro = true;

	switch(key) {
		// Special keys
		case BACKSPACE:
			countPrefix = 0;
			logText('Count prefix: ' + countPrefix);
			break;

		// Number keys
		case '0': case '1': case '2': case '3': case '4':
		case '5': case '6': case '7': case '8': case '9':
			countPrefix = countPrefix * 10 + parseInt(key);
			logText('Count prefix: ' + countPrefix);
			break;

		// WASD and hjkl bindings
		case 'w': case 'k': proxy.forward(countPrefix ? countPrefix : 20); countPrefix = 0; break;
		case 's': case 'j': proxy.backward(countPrefix ? countPrefix : 20); countPrefix = 0; break;
		case 'd': case 'l': proxy.right(countPrefix ? countPrefix : 20); countPrefix = 0; break;
		case 'a': case 'h': proxy.left(countPrefix ? countPrefix : 20); countPrefix = 0; break;

		case 'c': proxy['clear!'](); break;
		case 'r': proxy['stop!'](); proxy['reset!'](); proxy['killClones!'](); break;
		case ',': case '¼': proxy['pendown!'](); break; // Comma
		case '.': case '¾': proxy['penup!'](); break; // Period
		case '\\': proxy._isVisible ? proxy['hide!']() : proxy['show!'](); break;

		// Macro
		case 'q':
			// Record if stopped, Stop if recording
			if (isMacroRecording) { stopRecordingMacro(); }
			else { recordMacro(); }
			addToMacro = false;
			break;

		case '@':
			repeat(countPrefix ? countPrefix : 1, function() { playMacro(); });
			addToMacro = false;
			break;

		default:
			logText('Unknown command: ' + key);
			addToMacro = false;
	}

	// Record macro, not recording the 'q' or '@' keys or unknown keys
	if (addToMacro) {
		macro.push(key);
	}
}

function keyPressed() {
	// Only parse backspace
	if (keyCode === BACKSPACE) {
		parseKey(keyCode);
	}
}

function keyTyped() {
	parseKey(key);
	// TODO why doesn't key repeat work?
}

// TODO: make macros not based on keypress
function recordMacro() {
	logText(''); // trigger refresh
	isMacroRecording = true;
	macro_old = macro;
	macro = [];
}

function stopRecordingMacro() {
	logText('Macro recorded: ' + macro.join(''));
	isMacroRecording = false;
}

function playMacro() {
	// Don't play the current macro when currently recording a macro
	if (!isMacroRecording) { // TODO
		logText('Playing macro: ' + macro.join(''));
		for (let i in macro) {
			parseKey(macro[i]);
		}
	}
	// Play the old macro instead
	else {
		logText('Playing old macro: ' + macro_old);
		for (let i in macro_old) {
			parseKey(macro_old[i]);
		}
	}
}

// Log text to console and canvas
function logText(str) {
	t._commandFinished = false; // Set dirty flag and trigger refresh
	console.log(str);
	message = str;
}

/* Ideas
 * Turing tarpit like brainf?
 */

// Export to the iframe's global namespace so that main window can access them
window.t = t;
window.proxy = proxy;
