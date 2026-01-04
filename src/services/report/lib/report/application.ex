defmodule Report.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        ReportWeb.Telemetry,
        # Repo - only start if DB is enabled (for unit tests without DB)
        maybe_start_repo(),
        # PromEx for Prometheus metrics - must be before Endpoint
        maybe_start_prom_ex(),
        # Escalation Worker - checks for stale reports every 10s
        maybe_start_escalation_worker(),
        {DNSCluster, query: Application.get_env(:report, :dns_cluster_query) || :ignore},
        {Phoenix.PubSub, name: Report.PubSub},
        # Start a worker by calling: Report.Worker.start_link(arg)
        # {Report.Worker, arg},
        # Start to serve requests, typically the last entry
        ReportWeb.Endpoint
      ]
      |> List.flatten()
      |> Enum.reject(&is_nil/1)

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Report.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp maybe_start_repo do
    if Application.get_env(:report, :start_repo, true) do
      Report.Repo
    end
  end

  defp maybe_start_prom_ex do
    prom_config = Application.get_env(:report, Report.PromEx, [])

    if Keyword.get(prom_config, :disabled, false) do
      nil
    else
      Report.PromEx
    end
  end

  defp maybe_start_escalation_worker do
    worker_config = Application.get_env(:report, Report.EscalationWorker, [])

    if Keyword.get(worker_config, :enabled, true) do
      Report.EscalationWorker
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ReportWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
