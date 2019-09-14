const app = require('express')()

const { KopulaServerEndpoint } = require('./index.js')

const users = {
  'ffff-ffff-ffff': { name: 'John', id: 'ffff-ffff-ffff', coins: 10 }
}

class UserEndpoint extends KopulaServerEndpoint {
  constructor (express) {
    super('/api/user', express)
  }

  get ({ params }) {
    if (users[params.id]) {
      console.log('Fetched user: ', params.id)
      return users[params.id]
    } else {
      throw new Error('404 User not found.')
    }
  }

  post ({ body }) {
    if (!users[body.id]) {
      users[body.id] = body
      console.log('Created user: ', body.id)
      return users[body.id]
    } else {
      throw new Error('409 User already exists.')
    }
  }

  put ({ params, body }) {
    if (users[params.id]) {
      users[params.id] = { ...users[params.id], ...body }
      console.log('Updated user: ', params.id, '\nBody: ', body)
      return users[params.id]
    } else {
      throw new Error('404 User not found.')
    }
  }

  delete ({ params }) {
    if (users[params.id]) {
      delete users[params.id]
      console.log('Deleted user: ', params.id)
      return {}
    } else {
      throw new Error('404 User not found.')
    }
  }
}

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const userEndpoint = new UserEndpoint(app) // eslint-disable-line

const path = require('path')
app.get('/', (req, res) => res.sendFile(path.resolve('./exampleClient.html')))
app.get('/index.js', (req, res) => res.sendFile(path.resolve('./index.js')))

app.listen(80)
