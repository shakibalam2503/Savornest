exports.up = (pgm) => {
  pgm.createTable("user_profiles", {
    user_id: {
      type: "uuid",
      primaryKey: true,
    },
    full_name: {
      type: "varchar(150)",
      notNull: false,
    },
    phone: {
      type: "varchar(30)",
      notNull: false,
    },
    avatar_url: {
      type: "text",
      notNull: false,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "ACTIVE",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createTable("user_roles", {
    user_id: {
      type: "uuid",
      primaryKey: true,
    },
    role: {
      type: "varchar(20)",
      notNull: true,
      default: "CUSTOMER",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.addConstraint("user_roles", "user_roles_valid_role_check", {
    check: "role IN ('CUSTOMER', 'PROVIDER', 'RIDER', 'ADMIN')",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("user_roles");
  pgm.dropTable("user_profiles");
};