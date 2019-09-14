/*******************************************************
 * Copyright (C) 2019 Hampus Lundqvist <hampus0505@gmail.com>
 *
 * This file is licensed under the MIT license.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************/

/* global fetch */
const KOPULA = {
  STATUSES: {
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    306: '(Unused)',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Requested Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    420: 'Enhance Your Calm',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Reserved for WebDAV',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    444: 'No Response',
    449: 'Retry With',
    450: 'Blocked by Windows Parental Controls',
    451: 'Unavailable For Legal Reasons',
    499: 'Client Closed Request',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    509: 'Bandwidth Limit Exceeded',
    510: 'Not Extended',
    511: 'Network Authentication Required',
    598: 'Network read timeout error',
    599: 'Network connect timeout error'
  },
  KopulaNetworkabe: class KopulaNetworkabe {
    constructor (url, shape) {
      this.url = url
      this.shape = shape
      this.values = {}
      this.params = {}
    }

    async fetch (method = 'GET', params, body, options = {}) {
      this.params = params
      let url = this.url
      if (params && typeof (params) === 'object' && Object.keys(params).length > 0) {
        url += '?' + (
          Object.keys(params).map(param => `${param}=${encodeURIComponent(params[param])}`).join('&')
        )
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options
      })

      const response = {}
      if (res.ok) {
        const json = await res.json()

        Object.keys(this.shape).forEach(key => {
          const cast = this.shape[key]
          response[key] = typeof (cast) === 'function' ? cast(json[key]) : cast.type(json[key] || cast.default)
        })
      } else if (res.error) {
        throw new Error(res.error)
      } else {
        throw new Error('Something went wrong.')
      }

      this.values = response
      return response
    }

    async get (params, options = {}) {
      await this.fetch('GET', params || this.params, null, options)
      return this
    }

    async post (params, body, options = {}) {
      if (!body) { body = params; params = this.params }

      Object.keys(this.shape).forEach(key => {
        const cast = this.shape[key]
        body[key] = typeof (cast) === 'function' ? cast(body[key]) : cast.type(body[key] || cast.default)
      })

      await this.fetch('POST', params, body, options)
      if (Object.keys(params).length === 0) this.params = body
      return this
    }

    async put (params, body, options = {}) {
      if (!body) { body = params; params = this.params }
      await this.fetch('PUT', params, body, options)
      if (Object.keys(params).length === 0) this.params = body
      return this
    }

    async delete (params, options = {}) {
      await this.fetch('DELETE', params || this.params, null, options)
      return this
    }
  },
  KopulaServerEndpoint: class KopulaServerEndpoint {
    constructor (url, app) {
      app.get(url, (req, res) => this.request(req, res, this.get))
      app.post(url, (req, res) => this.request(req, res, this.post))
      app.put(url, (req, res) => this.request(req, res, this.put))
      app.delete(url, (req, res) => this.request(req, res, this.delete))
    }

    async request (req, res, processor) {
      const params = { ...req.params, ...req.query }

      try {
        const response = await processor({ req, res, params, body: req.body })
        res.status(200).send(response)
      } catch (e) {
        const error = e.message.split(' ')
        const status = Number(error.shift())
        res.status(isNaN(status) ? 500 : status).send({ error: error.join(' ') })
      }
    }

    async get () { throw new Error(501) }
    async post () { throw new Error(501) }
    async put () { throw new Error(501) }
    async delete () { throw new Error(501) }
  }
}

class Kopula { // eslint-disable-line
  constructor (url, shape) {
    this.url = url
    this.shape = shape

    this.STATUSES = KOPULA.STATUSES
    this.Networkable = KOPULA.KopulaNetworkabe
    this.ServerEndpoint = KOPULA.KopulaServerEndpoint
  }

  async get (params, options = {}) {
    const networkable = new this.Networkable(this.url, this.shape)
    await networkable.get(params, null, options)
    return networkable
  }

  async post (params, body, options = {}) {
    const networkable = new this.Networkable(this.url, this.shape)
    await networkable.post(params, body, options)
    return networkable
  }

  async put (params, body, options = {}) {
    const networkable = new this.Networkable(this.url, this.shape)
    await networkable.put(params, body, options)
    return networkable
  }

  async delete (params, options = {}) {
    const networkable = new this.Networkable(this.url, this.shape)
    await networkable.delete(params, null, options)
    return networkable
  }
}

try { module.exports = { Kopula, ...KOPULA } } catch (e) { }
