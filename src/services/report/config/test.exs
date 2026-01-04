import Config

# Mark as test environment for auth bypass
config :report, env: :test

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :report, Report.Repo,
  username: System.get_env("DB_USER", "root"),
  password: System.get_env("DB_PASSWORD", ""),
  hostname: System.get_env("DB_HOST", "localhost"),
  port: String.to_integer(System.get_env("DB_PORT", "26257")),
  database:
    System.get_env("DB_NAME", "report_test") <> "#{System.get_env("MIX_TEST_PARTITION", "")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2,
  # CockroachDB compatibility
  migration_lock: nil

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :report, ReportWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "CgCNxhxBXdc5cnfFaJGllmAtV+QyxgecDCwdVulDelgnFJWibX9oZtbydzNwZfBY",
  server: false

# In test we don't send emails
config :report, Report.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true

# Disable Escalation Worker during tests (to avoid side effects)
config :report, Report.EscalationWorker, enabled: false

# Disable NATS during tests
config :report, Report.NatsPublisher, enabled: false

# Disable PromEx during tests
config :report, Report.PromEx, disabled: true

# Disable Repo by default for unit tests (integration tests enable it)
config :report, start_repo: System.get_env("START_REPO", "false") == "true"
