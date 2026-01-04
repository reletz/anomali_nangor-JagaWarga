defmodule Report.PromEx do
  @moduledoc """
  PromEx configuration for Prometheus metrics.

  This module configures the metrics that will be exposed at `/metrics`
  for Prometheus to scrape.

  ## Metrics Exposed

  ### Phoenix Metrics
  - HTTP request duration, count, and status codes
  - Route-level breakdown

  ### Ecto Metrics
  - Database query duration
  - Connection pool usage

  ### Application Metrics (Custom)
  - `report_service_reports_created_total` - Total reports created
  - `report_service_reports_escalated_total` - Total reports escalated
  - `report_service_escalation_checks_total` - Number of escalation checks performed

  ### VM Metrics
  - Memory usage
  - Process counts
  - Garbage collection
  """

  use PromEx, otp_app: :report

  alias PromEx.Plugins

  @impl true
  def plugins do
    [
      # PromEx built-in plugins
      Plugins.Application,
      Plugins.Beam,
      {Plugins.Phoenix, router: ReportWeb.Router, endpoint: ReportWeb.Endpoint},
      Plugins.Ecto,

      # Custom application metrics
      Report.PromEx.ReportPlugin
    ]
  end

  @impl true
  def dashboard_assigns do
    [
      datasource_id: "prometheus",
      default_selected_interval: "30s"
    ]
  end

  @impl true
  def dashboards do
    [
      # PromEx built-in Grafana dashboards
      {:prom_ex, "application.json"},
      {:prom_ex, "beam.json"},
      {:prom_ex, "phoenix.json"},
      {:prom_ex, "ecto.json"}
    ]
  end
end
