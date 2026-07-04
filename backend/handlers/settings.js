import { authenticate } from '../lib/auth.js'
import { getItem, putItem } from '../lib/dynamo.js'
import { ok, unauthorized, serverError } from '../lib/response.js'

function settingsSK(tracker) {
  return tracker && tracker !== 'work' ? `SETTINGS#${tracker}` : 'SETTINGS'
}

export async function handler(event) {
  try {
    const user = await authenticate(event)
    if (!user) return unauthorized()

    const method = event.requestContext.http.method
    const SK = settingsSK(event.queryStringParameters?.tracker)

    if (method === 'GET') {
      const item = await getItem({
        PK: `USER#${user.sub}`,
        SK,
      })
      return ok({ categories: item?.categories || null, updatedAt: item?.updatedAt || null })
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const updatedAt = body.updatedAt || new Date().toISOString()
      await putItem({
        PK: `USER#${user.sub}`,
        SK,
        categories: body.categories,
        updatedAt,
      })
      return ok({ success: true, updatedAt })
    }

    return ok({ categories: null })
  } catch (err) {
    console.error(err)
    return serverError('Internal server error')
  }
}
