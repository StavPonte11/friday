console.log('DEBUG: Global Request exists?', typeof Request !== 'undefined');
console.log('DEBUG: Global fetch exists?', typeof fetch !== 'undefined');

const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { MessageChannel, MessagePort } = require('node:worker_threads');

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;
global.MessageChannel = MessageChannel;
global.MessagePort = MessagePort;

if (typeof Request === 'undefined') {
    const fetch = require('node-fetch');
    global.fetch = fetch;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
    global.Headers = fetch.Headers;
}
