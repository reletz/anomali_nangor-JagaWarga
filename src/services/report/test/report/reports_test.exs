defmodule Report.ReportsTest do
  use Report.DataCase

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

    test "list_public_reports/0 returns only public reports" do
      public_report = public_report_fixture()
      private_report = private_report_fixture()

      reports = Reports.list_public_reports()

      assert Enum.any?(reports, fn r -> r.id == public_report.id end)
      refute Enum.any?(reports, fn r -> r.id == private_report.id end)
    end

    test "list_public_reports_by_department/1 filters by department" do
      public_report_fixture(authority_department: "kebersihan")
      public_report_fixture(authority_department: "kesehatan")

      reports = Reports.list_public_reports_by_department("kebersihan")

      assert Enum.all?(reports, fn r -> r.authority_department == "kebersihan" end)
    end

    test "list_reports_by_department/1 returns all privacy levels" do
      public_report_fixture(authority_department: "kebersihan")
      private_report_fixture(authority_department: "kebersihan")
      anonymous_report_fixture(authority_department: "kebersihan")

      reports = Reports.list_reports_by_department("kebersihan")

      privacy_levels = Enum.map(reports, & &1.privacy_level) |> Enum.uniq() |> Enum.sort()
      assert "anonymous" in privacy_levels
      assert "private" in privacy_levels
      assert "public" in privacy_levels
    end

    test "get_report_by_access_token/1 returns private report with valid token" do
      private_report = private_report_fixture()

      assert report = Reports.get_report_by_access_token(private_report.access_token)
      assert report.id == private_report.id
    end

    test "get_report_by_access_token/1 returns nil for invalid token" do
      assert Reports.get_report_by_access_token("invalid-token") == nil
    end

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

    test "create_report/1 generates access_token for private reports" do
      assert {:ok, %ReportSchema{} = report} = Reports.create_report(@private_attrs)
      assert report.privacy_level == "private"
      assert report.access_token != nil
      assert String.length(report.access_token) > 20
    end

    test "create_report/1 does not generate access_token for public reports" do
      assert {:ok, %ReportSchema{} = report} = Reports.create_report(@valid_attrs)
      assert report.privacy_level == "public"
      assert report.access_token == nil
    end

    test "create_report/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Reports.create_report(@invalid_attrs)
    end
  end
end
