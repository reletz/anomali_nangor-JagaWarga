defmodule Report.Reports do
  @moduledoc """
  The Reports context.
  """

  import Ecto.Query, warn: false
  alias Report.Repo
  alias Report.Report

  @doc """
  Creates a report.
  """
  def create_report(attrs \\ %{}) do
    %Report{}
    |> Report.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Returns the list of public reports (privacy_level = 'public').
  Sorted by creation date descending (newest first).
  """
  def list_public_reports do
    Report
    |> where([r], r.privacy_level == "public")
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Returns the list of public reports filtered by department.
  """
  def list_public_reports_by_department(department) do
    Report
    |> where([r], r.privacy_level == "public")
    |> where([r], r.authority_department == ^department)
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Returns the list of public reports filtered by status.
  """
  def list_public_reports_by_status(status) do
    Report
    |> where([r], r.privacy_level == "public")
    |> where([r], r.status == ^status)
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Returns reports submitted by a specific reporter.
  Citizens can view their own reports (excludes anonymous reports).
  """
  def list_reports_by_reporter(reporter_id) do
    Report
    |> where([r], r.reporter_id == ^reporter_id)
    |> where([r], r.privacy_level in ["public", "private"])
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Gets a single report if it belongs to the reporter.
  """
  def get_report_by_reporter(report_id, reporter_id) do
    case Repo.get(Report, report_id) do
      nil ->
        {:error, :not_found}

      report ->
        # Allow if it's the reporter's own report (not anonymous)
        if report.reporter_id == reporter_id and report.privacy_level != "anonymous" do
          {:ok, report}
        else
          {:error, :forbidden}
        end
    end
  end

  @doc """
  Returns all reports for a specific authority department.
  Authorities can see ALL reports assigned to them (public, private, anonymous).
  """
  def list_reports_by_department(department) do
    Report
    |> where([r], r.authority_department == ^department)
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end
  
  @doc """
  Returns the list of all reports (admin use only).
  """
  def list_reports do
    Report
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Gets a single report or returns nil if not found
  """
  def get_report(id), do: Repo.get(Report, id)

  @doc """
  Gets a single report.

  Raises `Ecto.NoResultsError` if the Report does not exist.
  """
  def get_report!(id), do: Repo.get!(Report, id)

  @doc """
  Lists reports that are in 'submitted' status and older than the given cutoff.
  Used by the Escalation Worker.
  """
  def list_stale_reports(cutoff_time) do
    from(r in Report,
      where: r.status == "submitted" and r.created_at < ^cutoff_time,
      order_by: [asc: r.created_at]
    )
    |> Repo.all()
  end

  @doc """
  Updates a report status to 'escalated'.
  """
  def escalate_report(%Report{} = report) do
    report
    |> Report.changeset(%{
      status: "escalated",
      escalated_at: DateTime.utc_now() |> DateTime.truncate(:second)
    })
    |> Repo.update()
  end
end
