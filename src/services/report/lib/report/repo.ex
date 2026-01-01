defmodule Report.Repo do
  use Ecto.Repo,
    otp_app: :report,
    adapter: Ecto.Adapters.Postgres
end
