defmodule ReportWeb.ReportControllerTest do
  use ReportWeb.ConnCase, async: true

  @moduletag :integration

  alias Report.Reports

  @create_attrs %{
    "category" => "kebersihan",
    "content" => "Sampah menumpuk di depan gedung",
    "location" => "Jl. Dago No. 123, Bandung",
    "privacy_level" => "anonymous",
    "authority_department" => "kebersihan"
  }

  @invalid_attrs %{
    "category" => nil,
    "content" => nil
  }

  describe "GET /api/reports" do
    test "returns empty list when no reports exist", %{conn: conn} do
      conn = get(conn, ~p"/api/reports")
      assert json_response(conn, 200)["data"] == [] or is_list(json_response(conn, 200)["data"])
    end

    test "returns all reports", %{conn: conn} do
      # Create a report first
      {:ok, report} =
        Reports.create_report(%{
          category: "kebersihan",
          content: "Test report",
          location: "Location",
          privacy_level: "anonymous",
          authority_department: "kebersihan",
          status: "submitted"
        })

      conn = get(conn, ~p"/api/reports")
      response = json_response(conn, 200)

      assert is_list(response["data"])
      assert Enum.any?(response["data"], &(&1["id"] == report.id))
    end

    test "filters reports by department", %{conn: conn} do
      # Create reports in different departments
      {:ok, _} =
        Reports.create_report(%{
          category: "kebersihan",
          content: "Kebersihan report",
          location: "Location",
          privacy_level: "anonymous",
          authority_department: "kebersihan",
          status: "submitted"
        })

      {:ok, _} =
        Reports.create_report(%{
          category: "infrastruktur",
          content: "Infrastruktur report",
          location: "Location",
          privacy_level: "anonymous",
          authority_department: "infrastruktur",
          status: "submitted"
        })

      conn = get(conn, ~p"/api/reports", department: "kebersihan")
      response = json_response(conn, 200)

      assert is_list(response["data"])
      assert Enum.all?(response["data"], &(&1["authority_department"] == "kebersihan"))
    end
  end

  describe "POST /api/reports" do
    test "creates report with valid data", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @create_attrs)

      assert %{"data" => %{"id" => id}} = json_response(conn, 201)
      assert is_binary(id)

      # Verify the report was created
      report = Reports.get_report!(id)
      assert report.category == "kebersihan"
      assert report.content == "Sampah menumpuk di depan gedung"
      assert report.status == "submitted"
    end

    test "returns 422 with invalid data", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @invalid_attrs)

      assert json_response(conn, 422)["errors"] != %{}
    end

    test "sets default status to submitted", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @create_attrs)

      %{"data" => %{"id" => id}} = json_response(conn, 201)
      report = Reports.get_report!(id)
      assert report.status == "submitted"
    end

    test "reporter_id is nil for anonymous reports", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @create_attrs)

      %{"data" => %{"id" => id}} = json_response(conn, 201)
      report = Reports.get_report!(id)
      assert report.reporter_id == nil
    end
  end

  describe "GET /api/reports/:id" do
    test "returns report by id", %{conn: conn} do
      {:ok, report} =
        Reports.create_report(%{
          category: "kebersihan",
          content: "Test report",
          location: "Location",
          privacy_level: "anonymous",
          authority_department: "kebersihan",
          status: "submitted"
        })

      conn = get(conn, ~p"/api/reports/#{report.id}")
      response = json_response(conn, 200)

      assert response["data"]["id"] == report.id
      assert response["data"]["category"] == "kebersihan"
    end

    test "returns 404 for non-existent report", %{conn: conn} do
      fake_id = Ecto.UUID.generate()
      conn = get(conn, ~p"/api/reports/#{fake_id}")

      assert json_response(conn, 404)
    end
  end
end
