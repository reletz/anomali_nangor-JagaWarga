defmodule ReportWeb.ReportJSON do
  alias Report.Report

  @doc """
  Renders a list of reports.
  """
  def index(%{reports: reports}) do
    %{data: for(report <- reports, do: data(report))}
  end

  @doc """
  Renders a single report.
  """
  def show(%{report: report}) do
    %{data: data(report)}
  end

  defp data(%Report{} = report) do
    %{
      id: report.id,
      reporter_id: report.reporter_id,
      privacy_level: report.privacy_level,
      category: report.category,
      content: report.content,
      location: report.location,
      status: report.status,
      authority_department: report.authority_department,
      created_at: report.created_at,
      escalated_at: report.escalated_at
    }
  end
end
