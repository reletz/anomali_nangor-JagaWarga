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

  # ============================================================================
  # PUBLIC REPORTS (No Authentication Required)
  # ============================================================================

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
  Returns reports submitted by a specific user (for "private" reports).
  Citizens can only view their own private reports.
  Anonymous reports cannot be viewed by anyone except authorities.
  """
  def list_reports_by_reporter(reporter_id) do
    Report
    |> where([r], r.reporter_id == ^reporter_id)
    |> where([r], r.privacy_level == "private")
    |> order_by([r], desc: r.created_at)
    |> Repo.all()
  end

  @doc """
  Gets a report by ID if the requester has permission to view it.

  Returns:
  - `{:ok, report}` if authorized
  - `{:error, :not_found}` if report doesn't exist
  - `{:error, :forbidden}` if unauthorized
  """
  def get_report_with_access_check(report_id, opts \\ []) do
    case Repo.get(Report, report_id) do
      nil ->
        {:error, :not_found}

      report ->
        cond do
          report.privacy_level == "public" ->
            {:ok, report}

          Keyword.has_key?(opts, :authority_department) ->
            if report.authority_department == opts[:authority_department] do
              {:ok, report}
            else
              {:error, :forbidden}
            end

          Keyword.has_key?(opts, :reporter_id) ->
            if report.privacy_level == "private" && report.reporter_id == opts[:reporter_id] do
              {:ok, report}
            else
              {:error, :forbidden}
            end

          true ->
            {:error, :forbidden}
        end
    end
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
