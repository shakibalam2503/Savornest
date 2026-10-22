
exports.up = (pgm) => {
  pgm.createTable("outbox_events", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    aggregate_type: {
      type: "varchar(100)",
      notNull: true,
    },
    aggregate_id: {
      type: "uuid",
      notNull: true,
    },
    event_type: {
      type: "varchar(150)",
      notNull: true,
    },
    payload: {
      type: "jsonb",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    published_at: {
      type: "timestamptz",
    },
    attempts: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    last_error: {
      type: "text",
    },
  });

  pgm.addConstraint(
    "outbox_events",
    "outbox_events_attempts_nonnegative",
    {
      check: "attempts >= 0",
    }
  );

  pgm.createIndex("outbox_events", "created_at", {
    name: "idx_outbox_events_unpublished",
    where: "published_at IS NULL",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("outbox_events");
};
