defmodule ReportWeb.ReportController do
  use ReportWeb, :controller

  alias Report.Reports
  alias Report.Report, as: ReportSchema

  require Logger

  action_fallback ReportWeb.FallbackController

  @doc """
  Lists public reports only (privacy_level = 'public').
  No authentication required.
  Can be filtered by department or status.
  """
  def public(conn, params) do
    reports =
      case params do
        %{"department" => dept, "status" => status}
        when is_binary(dept) and dept != "" and is_binary(status) and status != "" ->
          # Filter by both department and status
          Reports.list_public_reports()
          |> Enum.filter(&(&1.authority_department == dept and &1.status == status))

        %{"department" => dept} when is_binary(dept) and dept != "" ->
          Reports.list_public_reports_by_department(dept)

        %{"status" => status} when is_binary(status) and status != "" ->
          Reports.list_public_reports_by_status(status)

        _ ->
          Reports.list_public_reports()
      end

    render(conn, :index, reports: reports)
  end

  @doc """
  Lists reports for authenticated authority.
  Returns ALL reports (public, private, anonymous) assigned to their department.
  """
  def index(conn, params) do
    current_user = conn.assigns[:current_user]
    user_department = current_user["department"]
    requested_dept = Map.get(params, "department")

    cond do
      # No department specified - return user's own department reports
      is_nil(requested_dept) or requested_dept == "" ->
        reports = Reports.list_reports_by_department(user_department)
        render(conn, :index, reports: reports)

      # Department specified - verify it matches user's department
      requested_dept == user_department ->
        reports = Reports.list_reports_by_department(requested_dept)
        render(conn, :index, reports: reports)

      # Trying to access another department - DENY
      true ->
        Logger.warning(
          "Access denied: User from #{user_department} tried to access #{requested_dept}"
        )

        conn
        |> put_status(:forbidden)
        |> json(%{
          error: "Access denied",
          message: "You can only view reports from your department (#{user_department})",
          requested_department: requested_dept,
          your_department: user_department
        })
    end
  end

  @doc """
  Shows a single report.
  Access control:
  - Public reports: Anyone can view (but this endpoint requires auth anyway)
  - Private reports: Only reporter OR assigned authority can view
  - Anonymous reports: Only assigned authority can view
  """
  def show(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]
    user_department = current_user["department"]

    case Reports.get_report_with_access_check(id, authority_department: user_department) do
      {:ok, report} ->
        render(conn, :show, report: report)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Report not found"})

      {:error, :forbidden} ->
        Logger.warning("Forbidden: User from #{user_department} tried to access report #{id}")

        conn
        |> put_status(:forbidden)
        |> json(%{
          error: "Access denied",
          message: "This report belongs to a different department"
        })
    end
  end

  @doc """
  Creates a new report.
  Expects a JSON body with report attributes.
  """
  def create(conn, %{"report" => report_params}) do
    with {:ok, %ReportSchema{} = report} <- Reports.create_report(report_params) do
      # Emit telemetry event for metrics
      Report.Telemetry.report_created(report)

      # Publish NATS event (async, don't block response)
      Task.start(fn ->
        Report.NatsPublisher.publish_report_created(report)
      end)

      conn
      |> put_status(:created)
      |> render(:show, report: report)
    end
  end
end
