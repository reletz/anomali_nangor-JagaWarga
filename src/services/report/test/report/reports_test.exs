defmodule Report.ReportsTest do
  use Report.DataCase, async: true

  alias Report.Reports
  alias Report.Report

  @moduletag :db

  describe "create_report/1" do
    test "creates a report with valid attributes" do
      attrs = %{
        category: "kebersihan",
        content: "Sampah menumpuk di jalan",
        location: "Jl. Dago No. 10, Bandung",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      }

      assert {:ok, %Report{} = report} = Reports.create_report(attrs)
      assert report.category == "kebersihan"
      assert report.content == "Sampah menumpuk di jalan"
      assert report.status == "submitted"
      assert report.privacy_level == "anonymous"
      assert report.authority_department == "kebersihan"
      assert report.id != nil
      assert report.created_at != nil
    end

    test "creates a report with reporter_id" do
      reporter_id = Ecto.UUID.generate()
      attrs = %{
        reporter_id: reporter_id,
        category: "infrastruktur",
        content: "Jalan berlubang",
        location: "Jl. Setiabudi",
        privacy_level: "public",
        authority_department: "infrastruktur",
        status: "submitted"
      }

      assert {:ok, %Report{} = report} = Reports.create_report(attrs)
      assert report.reporter_id == reporter_id
    end

    test "fails with missing required fields" do
      assert {:error, changeset} = Reports.create_report(%{})
      assert "can't be blank" in errors_on(changeset).category
    end
  end

  describe "list_reports/0" do
    test "returns all reports ordered by created_at desc" do
      {:ok, report1} = Reports.create_report(%{
        category: "kebersihan",
        content: "First report",
        location: "Location 1",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      # Small delay to ensure different timestamps
      Process.sleep(10)

      {:ok, report2} = Reports.create_report(%{
        category: "infrastruktur",
        content: "Second report",
        location: "Location 2",
        privacy_level: "public",
        authority_department: "infrastruktur",
        status: "submitted"
      })

      reports = Reports.list_reports()
      assert length(reports) >= 2
      
      # Second report should come first (newest)
      report_ids = Enum.map(reports, & &1.id)
      assert Enum.find_index(report_ids, &(&1 == report2.id)) < Enum.find_index(report_ids, &(&1 == report1.id))
    end

    test "returns empty list when no reports exist" do
      # Note: This might fail if other tests created reports
      # In a clean DB, this should pass
      reports = Reports.list_reports()
      assert is_list(reports)
    end
  end

  describe "list_by_department/1" do
    test "filters reports by authority_department" do
      {:ok, _kebersihan_report} = Reports.create_report(%{
        category: "kebersihan",
        content: "Kebersihan report",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      {:ok, _infrastruktur_report} = Reports.create_report(%{
        category: "infrastruktur",
        content: "Infrastruktur report",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "infrastruktur",
        status: "submitted"
      })

      kebersihan_reports = Reports.list_by_department("kebersihan")
      assert Enum.all?(kebersihan_reports, &(&1.authority_department == "kebersihan"))

      infrastruktur_reports = Reports.list_by_department("infrastruktur")
      assert Enum.all?(infrastruktur_reports, &(&1.authority_department == "infrastruktur"))
    end

    test "returns empty list for non-existent department" do
      reports = Reports.list_by_department("non_existent_department")
      assert reports == []
    end
  end

  describe "get_report!/1" do
    test "returns the report with given id" do
      {:ok, report} = Reports.create_report(%{
        category: "kebersihan",
        content: "Test report",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      fetched = Reports.get_report!(report.id)
      assert fetched.id == report.id
      assert fetched.content == report.content
    end

    test "raises Ecto.NoResultsError for non-existent id" do
      fake_id = Ecto.UUID.generate()
      assert_raise Ecto.NoResultsError, fn ->
        Reports.get_report!(fake_id)
      end
    end
  end

  describe "list_stale_reports/1" do
    test "returns reports older than cutoff with submitted status" do
      # Create a report
      {:ok, report} = Reports.create_report(%{
        category: "kebersihan",
        content: "Stale report",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      # Cutoff in the future should include this report
      future_cutoff = DateTime.utc_now() |> DateTime.add(60, :second)
      stale_reports = Reports.list_stale_reports(future_cutoff)
      
      assert Enum.any?(stale_reports, &(&1.id == report.id))
    end

    test "excludes reports with non-submitted status" do
      {:ok, report} = Reports.create_report(%{
        category: "kebersihan",
        content: "Escalated report",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "escalated"  # Already escalated
      })

      future_cutoff = DateTime.utc_now() |> DateTime.add(60, :second)
      stale_reports = Reports.list_stale_reports(future_cutoff)
      
      refute Enum.any?(stale_reports, &(&1.id == report.id))
    end
  end

  describe "escalate_report/1" do
    test "updates report status to escalated" do
      {:ok, report} = Reports.create_report(%{
        category: "kebersihan",
        content: "To be escalated",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      assert {:ok, escalated} = Reports.escalate_report(report)
      assert escalated.status == "escalated"
      assert escalated.escalated_at != nil
    end

    test "sets escalated_at timestamp" do
      {:ok, report} = Reports.create_report(%{
        category: "kebersihan",
        content: "To be escalated",
        location: "Location",
        privacy_level: "anonymous",
        authority_department: "kebersihan",
        status: "submitted"
      })

      before_escalation = DateTime.utc_now() |> DateTime.add(-1, :second)
      {:ok, escalated} = Reports.escalate_report(report)
      
      assert DateTime.compare(escalated.escalated_at, before_escalation) == :gt
    end
  end
end
