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

    @invalid_attrs %{
      category: nil,
      content: nil,
      privacy_level: nil,
      authority_department: nil,
      status: nil
    }

    # =========================================================================
    # Public Reports - Accessible to general public
    # =========================================================================

    test "get_report_with_access_check/2 allows anyone to view public reports" do
      report = public_report_fixture(authority_department: "kesehatan")

      # Public reports can be viewed by any department
      assert {:ok, fetched_report} =
               Reports.get_report_with_access_check(report.id, authority_department: "kebersihan")

      assert fetched_report.id == report.id
    end

    # =========================================================================
    # Private/Anonymous Reports - Only accessible by assigned authority
    # =========================================================================

    test "get_report_with_access_check/2 allows assigned authority to view private reports" do
      report = private_report_fixture(authority_department: "keamanan")

      assert {:ok, fetched_report} =
               Reports.get_report_with_access_check(report.id, authority_department: "keamanan")

      assert fetched_report.id == report.id
    end

    test "get_report_with_access_check/2 denies other dept from viewing private reports" do
      report = private_report_fixture(authority_department: "keamanan")

      # Department of Cleanliness cannot view crime (keamanan) reports
      assert {:error, :forbidden} =
               Reports.get_report_with_access_check(report.id, authority_department: "kebersihan")
    end

    test "get_report_with_access_check/2 allows assigned authority to view anonymous reports" do
      report = anonymous_report_fixture(authority_department: "kesehatan")

      assert {:ok, fetched_report} =
               Reports.get_report_with_access_check(report.id, authority_department: "kesehatan")

      assert fetched_report.id == report.id
    end

    test "get_report_with_access_check/2 denies other dept from viewing anonymous reports" do
      report = anonymous_report_fixture(authority_department: "kesehatan")

      # Other departments cannot view anonymous reports
      assert {:error, :forbidden} =
               Reports.get_report_with_access_check(report.id, authority_department: "kebersihan")
    end

    # =========================================================================
    # CRUD Operations
    # =========================================================================

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
