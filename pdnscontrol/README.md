# Development / Building

The requirements below are needed for developing pdnscontrol or building a distribution.

We use `bower` to manage JavaScript dependencies. `grunt` is used to build CSS.

## Requirements

You'll need to have the following items installed before continuing.

  * [Node.js](http://nodejs.org): Use the installer provided on the NodeJS website.
  * [Grunt](http://gruntjs.com/): Run `[sudo] npm install -g grunt-cli`
  * [Bower](http://bower.io): Run `[sudo] npm install -g bower`

## Quickstart

```bash
npm install && bower install
npm install -g grunt-cli
```

While you're working on your project, run:

`grunt`

And you're set!

## Directory Strucutre

  * `scss/\_settings.scss`: Foundation configuration settings go in here
  * `scss/app.scss`: Application styles go here

## Running tests

Run the karma tests:

```
node_modules/.bin/karma start test/karma.conf.js --no-auto-watch --single-run --reporters=dots --browsers=Firefox
```

For protractor tests, please look at the protractor user manual.
