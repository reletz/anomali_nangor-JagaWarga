defmodule Report.ReportsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Report.Reports` context.
  """

  @doc """
  Generate a public report.
  """
  def public_report_fixture(attrs \\ %{}) do
    {:ok, report} =
      attrs
      |> Enum.into(%{
        category: "sampah",
        content: "Some public content",
        location: "Some location",
        privacy_level: "public",
        authority_department: "kebersihan",
        status: "submitted"
      })
      |> Report.Reports.create_report()

    report
  end

  @doc """
  Generate a private report with access token.
  """
  def private_report_fixture(attrs \\ %{}) do
    {:ok, report} =
      attrs
      |> Enum.into(%{
        category: "keamanan",
        content: "Some private content",
        location: "Private location",
        privacy_level: "private",
        authority_department: "keamanan",
        status: "submitted",
        reporter_id: "test-reporter-#{:rand.uniform(1000)}"
      })
      |> Report.Reports.create_report()

    report
  end

  @doc """
  Generate an anonymous report.
  """
  def anonymous_report_fixture(attrs \\ %{}) do
    {:ok, report} =
      attrs
      |> Enum.into(%{
        category: "kesehatan",
        content: "Some anonymous content",
        privacy_level: "anonymous",
        authority_department: "kesehatan",
        status: "submitted"
      })
      |> Report.Reports.create_report()

    report
  end
end
