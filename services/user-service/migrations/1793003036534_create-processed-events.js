
exports.up = (pgm) => {
  pgm.createTable("processed_events", {
    event_id: {
      type: "uuid",
      primaryKey: true,
      notNull: true,
    },
    event_type: {
      type: "varchar(100)",
      notNull: true,
    },
    processed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("processed_events");
};
