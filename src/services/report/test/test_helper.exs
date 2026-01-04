ExUnit.start()

# Only setup sandbox mode if Repo is started (for integration tests)
if Application.get_env(:report, :start_repo, true) do
  Ecto.Adapters.SQL.Sandbox.mode(Report.Repo, :manual)
end
