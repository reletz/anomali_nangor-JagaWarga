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
  Returns the list of reports.
  """
  def list_reports do
    Report
    |> order_by(desc: :created_at)
    |> Repo.all()
  end

  @doc """
  Returns the list of reports filtered by authority department.
  """
  def list_by_department(department) do
    from(r in Report,
      where: r.authority_department == ^department,
      order_by: [desc: r.created_at]
    )
    |> Repo.all()
  end

  @doc """
  Gets a single report.

  Raises `Ecto.NoResultsError` if the Report does not exist.
  """
  def get_report!(id), do: Repo.get(Report, id)

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
