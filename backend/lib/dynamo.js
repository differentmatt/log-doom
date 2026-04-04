import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE = process.env.TABLE_NAME

export async function getItem(key) {
  const { Item } = await client.send(
    new GetCommand({ TableName: TABLE, Key: key }),
  )
  return Item || null
}

export async function putItem(item) {
  await client.send(new PutCommand({ TableName: TABLE, Item: item }))
}

export async function deleteItem(key) {
  await client.send(new DeleteCommand({ TableName: TABLE, Key: key }))
}

export async function queryItems(pk, skFrom, skTo) {
  const { Items } = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':from': skFrom,
        ':to': skTo,
      },
    }),
  )
  return Items || []
}
