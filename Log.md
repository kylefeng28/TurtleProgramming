# Log

## 3/13/17
- Converted to pug.
- Started using gulp as a task runner.
- Added bootstrap layout.
- Started using Vue.js for MVC.

## 3/14/17
- Added toolbar buttons and command catalog.
  - Vue is making this pretty easy.
- Added cloning.
  - There is the MOAT (mother of all turtles), t, which, as the name implies, is the ancestor of turtles. When a turtle is cloned, its clone is added to the list of clones. Update and draw recursively drawn the turtle's clones. 
- Urgent commands now stop the current executing command.
- Added screenshots.
- Refactored iframe into separate file for easier debugging and maintenance.
- Add basic python support.
  - Like Opal, Skulpt doesn't seem to retain globals.

## 3/15/17
- Improved python support.
  - Globals are now retained, by setting `retainglobals` to `true` in `Sk.configure`. I found this undocumented from the source for the Skulpt REPL, which seemed to do what I want.
  - [x] DONE: look into opal-irb
- Added basic snippet support. It seems like RequireJS is needed to register custom snippets.
  - [ ] TODO: set up RequireJS.
- Added CoffeeScript support.
  - CoffeeScript is the closest one of these languages to JavaScript; this should've been added first. It was only a matter of loading the CoffeeScript compiler (the author advises against loading it directly in a web page, but whatever) and calling `CoffeeScript.compile`. CoffeeScript wraps everything in a closure function, so globals cannot be retained, but stripping out the first and last lines of the closure before eval'ing seemed to do the trick.
- Upgraded p5.js from 0.3.5 to 0.5.7. Please.JS and named colors are now supported.
  - This was quite a version jump, since the old version was from 2014, so I'm surprised everything still works properly. The only thing that has changed is that key repeat doesn't work anymore, but that isn't very essential.
- Refactored URL parameters into the Vue instance: program, language, and autorun
- Added Guess a Number. A classic example, eh? This doesn't showcase the turtle graphics at all, only I/O. I added a function called `promptInt` that uses `parseInt` on a `prompt`, and defined `Number::times` so that CoffeeScript can use it to loop in a similar way to Ruby.
- Added program list to toolbar.
  - Guess A Number, Koch Snowflake, B1A4 Good Timing, Spiral, Clones
- Prefixed all private properties and methods with `_`; added promises.
  - All public methods should add to the command queue (basically lazy evaluation). The user isn't supposed to use instance variables, such as x and y, directly, since they store the current state, so their value is set to whatever they are when they are eval'd. For example, `for(var i = 0; i < 5; i++) { t.write(t._x); t.forward(50) }` would not work, as `t._x` would already be evaluated to, say 0, and would not be whatever x is when the `write` command is called in the command queue. `_addCommand` now returns a promise, which is either resolved or rejected in `executeNextCommand()`. The promise can be further wrapped in a Proxy or function, so that the value of, say `t.x`, can be evaluated lazily. 

## 3/16/17
- Added promise lazy evaluation for getters. [11:32]
  - Properties such as `t.x`, `t.y`, `t.ang` are now defined as properties that return a PromiseWrapper, which wraps the Promise returned by ``_addCommand()` and whose `valueOf` method returns the value of the property the time of the call. In `_executeNextCommand`, the promise wrapper gets unwrapped. Statements like  `for(var i = 0; i < 5; i++) { t.write(t.x); t.forward(50) }` now work as expected.
- Added lazy evaluation for functions passed to  `_executeNextCommand`. [13:21]
  - This makes it easier to pass in functions as arguments, so you can write `for(var i = 0; i < 5; i++) { t.write(() => Math.random() * 100); t.forward(50) }`. `_executeNextCommand` now uses the `valueOf` function of a `PromiseWrapper`.
- Added call function for PromiseWrapper.
  - You can now do this: `a = t.clone(); a.call((x) => { x.forward(100); x.right(90); })`
- Enabled irb mode for Opal. [18:17]
  - This allows local variables on main to be retained. I had to dig through the source for opal-irb, and it took me almost an hour to find that 'irb?' was a compiler option.

## 2/25/26
- Upgrade from Node 7 to Node 26 to build properly on modern systems after 9 years of inactivity
