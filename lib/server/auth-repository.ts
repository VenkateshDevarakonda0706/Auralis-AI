import "server-only"

import type { PoolClient } from "pg"
import { query, withTransaction } from "@/lib/server/db"

export type ResponseStyle = "short" | "detailed" | "with examples"

export type DbUser = {
  id: string
  name: string
  email: string
  password: string | null
  image: string | null
  provider: string
  google_id: string | null
  created_at: string
  updated_at: string
}

export type DbUserPreferences = {
  user_id: string
  response_style: ResponseStyle
  language: string | null
  updated_at: string
}

let usersImageColumnExists: boolean | null = null

async function hasUsersImageColumn(): Promise<boolean> {
  if (usersImageColumnExists !== null) {
    return usersImageColumnExists
  }

  const result = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'image'
      ) AS exists
    `,
  )

  usersImageColumnExists = Boolean(result.rows[0]?.exists)
  return usersImageColumnExists
}

function userSelectSql(includeImage: boolean) {
  return includeImage
    ? "SELECT id, name, email, password, image, provider, google_id, created_at, updated_at"
    : "SELECT id, name, email, password, provider, google_id, created_at, updated_at"
}

function userReturnSql(includeImage: boolean) {
  return includeImage
    ? "RETURNING id, name, email, password, image, provider, google_id, created_at, updated_at"
    : "RETURNING id, name, email, password, provider, google_id, created_at, updated_at"
}

function mapUserRow<T extends { image?: string | null }>(row: T | undefined | null, includeImage: boolean): DbUser | null {
  if (!row) {
    return null
  }

  const user = row as unknown as DbUser

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    provider: user.provider,
    google_id: user.google_id,
    created_at: user.created_at,
    updated_at: user.updated_at,
    image: includeImage ? row.image ?? null : null,
  }
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const includeImage = await hasUsersImageColumn()
  const result = await query<DbUser>(
    `
      ${userSelectSql(includeImage)}
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email.toLowerCase()],
  )

  return mapUserRow(result.rows[0], includeImage)
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const includeImage = await hasUsersImageColumn()
  const result = await query<DbUser>(
    `
      ${userSelectSql(includeImage)}
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  return mapUserRow(result.rows[0], includeImage)
}

export async function createPasswordUser(input: {
  name: string
  email: string
  passwordHash: string
  image?: string | null
}): Promise<DbUser> {
  const includeImage = await hasUsersImageColumn()
  const columns = includeImage ? "name, email, password, image, provider" : "name, email, password, provider"
  const values = includeImage ? "$1, $2, $3, $4, 'credentials'" : "$1, $2, $3, 'credentials'"
  const params = includeImage ? [input.name.trim(), input.email.toLowerCase(), input.passwordHash, input.image || null] : [input.name.trim(), input.email.toLowerCase(), input.passwordHash]
  const result = await query<DbUser>(
    `
      INSERT INTO users (${columns})
      VALUES (${values})
      ${userReturnSql(includeImage)}
    `,
    params,
  )

  return mapUserRow(result.rows[0], includeImage) as DbUser
}

export async function upsertGoogleUser(input: {
  name: string
  email: string
  googleId?: string | null
  image?: string | null
}): Promise<DbUser> {
  const includeImage = await hasUsersImageColumn()
  const insertColumns = includeImage ? "name, email, password, image, provider, google_id" : "name, email, password, provider, google_id"
  const values = includeImage ? "$1, $2, NULL, $4, 'google', $3" : "$1, $2, NULL, 'google', $3"
  const params = includeImage
    ? [input.name?.trim() || input.email.split("@")[0], input.email.toLowerCase(), input.googleId || null, input.image || null]
    : [input.name?.trim() || input.email.split("@")[0], input.email.toLowerCase(), input.googleId || null]
  const result = await query<DbUser>(
    `
      INSERT INTO users (${insertColumns})
      VALUES (${values})
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        google_id = COALESCE(users.google_id, EXCLUDED.google_id),
        provider = 'google',
        ${includeImage ? "image = COALESCE(users.image, EXCLUDED.image)," : ""}
        updated_at = NOW()
      ${userReturnSql(includeImage)}
    `,
    params,
  )

  return mapUserRow(result.rows[0], includeImage) as DbUser
}

export async function getOrCreateGoogleUser(input: {
  name: string
  email: string
  googleId?: string | null
  image?: string | null
}): Promise<DbUser> {
  const existing = await findUserByEmail(input.email)
  if (existing) {
    return upsertGoogleUser(input)
  }

  return upsertGoogleUser(input)
}

export async function getUserPreferences(userId: string): Promise<DbUserPreferences | null> {
  const result = await query<DbUserPreferences>(
    `
      SELECT user_id, response_style, language, updated_at
      FROM user_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rows[0] || null
}

export async function getUserProfile(userId: string): Promise<DbUser | null> {
  return findUserById(userId)
}

export async function updateUserProfile(input: {
  userId: string
  name: string
  image?: string | null
}): Promise<DbUser> {
  const includeImage = await hasUsersImageColumn()
  const setClause = includeImage ? "name = $2, image = $3, updated_at = NOW()" : "name = $2, updated_at = NOW()"
  const params = includeImage ? [input.userId, input.name.trim(), input.image || null] : [input.userId, input.name.trim()]
  const result = await query<DbUser>(
    `
      UPDATE users
      SET ${setClause}
      WHERE id = $1
      ${userReturnSql(includeImage)}
    `,
    params,
  )

  return mapUserRow(result.rows[0], includeImage) as DbUser
}

export async function updateUserPassword(input: {
  userId: string
  passwordHash: string
}): Promise<DbUser> {
  const result = await query<DbUser>(
    `
      UPDATE users
      SET password = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, password, image, provider, google_id, created_at, updated_at
    `,
    [input.userId, input.passwordHash],
  )

  return result.rows[0]
}

export async function upsertUserPreferences(input: {
  userId: string
  responseStyle?: ResponseStyle
  language?: string | null
}): Promise<DbUserPreferences> {
  const responseStyle = input.responseStyle || "detailed"
  const language = input.language?.trim() || null

  const result = await query<DbUserPreferences>(
    `
      INSERT INTO user_preferences (user_id, response_style, language)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id)
      DO UPDATE SET
        response_style = EXCLUDED.response_style,
        language = EXCLUDED.language,
        updated_at = NOW()
      RETURNING user_id, response_style, language, updated_at
    `,
    [input.userId, responseStyle, language],
  )

  return result.rows[0]
}

export async function ensureUserPreferences(userId: string): Promise<DbUserPreferences> {
  const existing = await getUserPreferences(userId)
  if (existing) {
    return existing
  }

  return upsertUserPreferences({ userId, responseStyle: "detailed" })
}

export async function runUserLookup(client: PoolClient, email: string): Promise<DbUser | null> {
  const includeImage = usersImageColumnExists ?? false
  const result = await client.query<DbUser>(
    `
      ${userSelectSql(includeImage)}
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email.toLowerCase()],
  )

  return mapUserRow(result.rows[0], includeImage)
}

export async function withDbTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction(handler)
}
