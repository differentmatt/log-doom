import { authenticate } from '../lib/auth.js'
import { queryItems, putItem, deleteItem } from '../lib/dynamo.js'
import { ok, badRequest, unauthorized, serverError } from '../lib/response.js'

function dayPrefix(tracker) {
  return tracker && tracker !== 'work' ? `DAY#${tracker}#` : 'DAY#'
}

export async function handler(event) {
  try {
    const user = await authenticate(event)
    if (!user) return unauthorized()

    const method = event.requestContext.http.method
    const tracker = event.queryStringParameters?.tracker
    const prefix = dayPrefix(tracker)

    if (method === 'GET') {
      const { from, to } = event.queryStringParameters || {}
      if (!from || !to) return badRequest('Missing from/to query parameters')
      const items = await queryItems(
        `USER#${user.sub}`,
        `${prefix}${from}`,
        `${prefix}${to}`,
      )
      const days = items.map((item) => ({
        date: item.SK.replace(prefix, ''),
        log: item.log,
        updatedAt: item.updatedAt || null,
      }))
      return ok(days)
    }

    if (method === 'PUT') {
      const date = event.pathParameters?.date
      if (!date) return badRequest('Missing date parameter')
      const body = JSON.parse(event.body || '{}')
      const updatedAt = body.updatedAt || new Date().toISOString()
      await putItem({
        PK: `USER#${user.sub}`,
        SK: `${prefix}${date}`,
        log: body.log,
        updatedAt,
      })
      return ok({ date, updatedAt })
    }

    if (method === 'DELETE') {
      const date = event.pathParameters?.date
      if (!date) return badRequest('Missing date parameter')
      await deleteItem({
        PK: `USER#${user.sub}`,
        SK: `${prefix}${date}`,
      })
      return ok({ date })
    }

    return badRequest('Unsupported method')
  } catch (err) {
    console.error(err)
    return serverError('Internal server error')
  }
}
