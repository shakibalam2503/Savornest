
const { pool } = require("../config/database");


async function createOutboxEvent(
  client,
  { id, aggregateType, aggregateId, eventType, payload }
) {
  const query = `
    INSERT INTO outbox_events (
      id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      created_at
  `;

  const values = [
    id,
    aggregateType,
    aggregateId,
    eventType,
    JSON.stringify(payload),
  ];

  const { rows } = await client.query(query, values);
  return rows[0];
}


async function getPendingOutboxEvents(limit = 100) {
  const query = `
    SELECT
      id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      created_at,
      attempts
    FROM outbox_events
    WHERE published_at IS NULL
    ORDER BY created_at ASC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [limit]);
  return rows;
}

async function markOutboxEventPublished(eventId) {
  const query = `
    UPDATE outbox_events
    SET published_at = CURRENT_TIMESTAMP,
        last_error = NULL
    WHERE id = $1
      AND published_at IS NULL
  `;

  await pool.query(query, [eventId]);
}

async function recordOutboxPublishFailure(eventId, errorMessage) {
  const query = `
    UPDATE outbox_events
    SET attempts = attempts + 1,
        last_error = $2
    WHERE id = $1
      AND published_at IS NULL
  `;

  await pool.query(query, [eventId, errorMessage]);
}

module.exports = {
  createOutboxEvent,
  getPendingOutboxEvents,
  markOutboxEventPublished,
  recordOutboxPublishFailure,
};
