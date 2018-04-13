#!/usr/bin/env node
/* file : sage-client.js
MIT License

Copyright (c) 2017 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

const fs = require('fs')
const program = require('commander')
const SageClient = require('../src/client.js')
const JSONFormatter = require('../src/formatters/json-formatter.js')

// Command line interface to execute queries
program
  .description('Execute a SPARQL query using a SaGe interface')
  .usage('<server> [options]')
  .option('-q, --query <query>', 'evaluates the given SPARQL query')
  .option('-f, --file <file>', 'evaluates the SPARQL query in the given file')
  .option('-t, --timeout <timeout>', 'set SPARQL query timeout in milliseconds (default: 30mn)', 30 * 60 * 1000)
  .option('t, --type <mime-type>', 'determines the MIME type of the output (e.g., application/json)', 'application/json')
  .parse(process.argv)

// get servers
if (program.args.length !== 1) {
  process.stderr.write('Error: you must specify exactly one server to use.\nSee ./bin/sage-client.js --help for more details.\n')
  process.exit(1)
}

const server = program.args[0]

// fetch SPARQL query to execute
let query = null
let timeout = null
if (program.query) {
  query = program.query
} else if (program.file && fs.existsSync(program.file)) {
  query = fs.readFileSync(program.file, 'utf-8')
} else {
  process.stderr.write('Error: you must specify a SPARQL query to execute.\nSee ./bin/sage-client.js --help for more details.\n')
  process.exit(1)
}

let nbResults = 0
const client = new SageClient(server)
let iterator = client.execute(query)
iterator = new JSONFormatter(iterator)

iterator.on('error', error => {
  process.stderr.write('ERROR: An error occurred during query execution.\n')
  process.stderr.write(error.stack)
})

iterator.on('end', () => {
  const endTime = Date.now()
  clearTimeout(timeout)
  const time = endTime - startTime
  process.stderr.write(`SPARQL query evaluated in ${time / 1000}s (${nbResults} mappings)\n`)
})
const startTime = Date.now()
iterator.on('data', data => {
  nbResults++
  process.stdout.write(data)
})

// set query timeout
timeout = setTimeout(() => {
  iterator.close()
  process.stderr.write(`TIMEOUT EXCEEDED (${program.timeout}ms) - shutting down query processing...\n`)
}, program.timeout)
