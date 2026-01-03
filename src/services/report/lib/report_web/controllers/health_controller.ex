defmodule ReportWeb.HealthController do
  use ReportWeb, :controller

  @doc """
  Health check endpoint.
  Returns 200 OK if the service is running.
  Optionally checks database connectivity.
  """
  def index(conn, _params) do
    # Basic health check
    health_status = %{
      status: "ok",
      service: "report-service",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Try to check database connectivity
    db_status =
      try do
        Report.Repo.query!("SELECT 1")
        "connected"
      rescue
        _ -> "disconnected"
      end

    response = Map.put(health_status, :database, db_status)

    if db_status == "connected" do
      json(conn, response)
    else
      conn
      |> put_status(:service_unavailable)
      |> json(response)
    end
  end
end
