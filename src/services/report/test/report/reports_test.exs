defmodule Report.ReportsTest do
  use Report.DataCase

  # All tests in this module require database
  @moduletag :db

  alias Report.Reports
  alias Report.Report, as: ReportSchema

  # Import fixtures at module level (before alias overrides Report)
  import Report.ReportsFixtures

  describe "reports" do
    @valid_attrs %{
      category: "sampah",
      content: "some content",
      location: "some location",
      privacy_level: "public",
      authority_department: "kebersihan",
      status: "submitted"
    }

    @private_attrs %{
      category: "keamanan",
      content: "private content",
      privacy_level: "private",
      authority_department: "keamanan",
      status: "submitted",
      reporter_id: "reporter-123"
    }

    @invalid_attrs %{
      category: nil,
      content: nil,
      privacy_level: nil,
      authority_department: nil,
      status: nil
    }

    test "get_report_with_access_check/2 allows authority to view any report in their dept" do
      report = public_report_fixture(authority_department: "kebersihan")

      assert {:ok, fetched_report} =
               Reports.get_report_with_access_check(report.id, authority_department: "kebersihan")

      assert fetched_report.id == report.id
    end

    test "get_report_with_access_check/2 denies authority from viewing other dept reports" do
      report = public_report_fixture(authority_department: "kesehatan")

      assert {:error, :forbidden} =
               Reports.get_report_with_access_check(report.id, authority_department: "kebersihan")
    end

    test "create_report/1 with valid data creates a report" do
      assert {:ok, %ReportSchema{} = report} = Reports.create_report(@valid_attrs)
      assert report.category == "sampah"
      assert report.content == "some content"
      assert report.privacy_level == "public"
    end

    test "create_report/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Reports.create_report(@invalid_attrs)
    end
  end
end
