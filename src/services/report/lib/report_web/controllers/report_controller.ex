defmodule ReportWeb.ReportController do
  use ReportWeb, :controller

  alias Report.Reports
  alias Report.Report

  action_fallback ReportWeb.FallbackController

  @doc """
  Lists reports.
  If `department` query param is provided, filters by authority_department.
  Otherwise returns all reports.
  """
  def index(conn, %{"department" => department}) do
    reports = Reports.list_by_department(department)
    render(conn, :index, reports: reports)
  end

  def index(conn, _params) do
    reports = Reports.list_reports()
    render(conn, :index, reports: reports)
  end

  @doc """
  Creates a new report.
  Expects a JSON body with report attributes.
  """
  def create(conn, %{"report" => report_params}) do
    with {:ok, %Report{} = report} <- Reports.create_report(report_params) do
      # TODO: Publish NATS event in Step 5
      # Gnat.pub(:gnat, "report.created", Jason.encode!(%{report_id: report.id}))

      conn
      |> put_status(:created)
      |> render(:show, report: report)
    end
  end

  def show(conn, %{"id" => id}) do
    report = Reports.get_report!(id)
    render(conn, :show, report: report)
  end
end
