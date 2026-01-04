defmodule ReportWeb.ReportControllerTest do
  use ReportWeb.ConnCase, async: true

  @moduletag :integration

  alias Report.Reports

  @create_attrs %{
    category: "sampah",
    content: "Test report content",
    location: "Test location",
    privacy_level: "public",
    authority_department: "kebersihan",
    status: "submitted"
  }

  @private_attrs %{
    category: "keamanan",
    content: "Private report content",
    location: "Secret location",
    privacy_level: "private",
    authority_department: "keamanan",
    status: "submitted",
    reporter_id: "00000000-0000-0000-0000-000000000001"
  }

  @anonymous_attrs %{
    category: "kesehatan",
    content: "Anonymous report content",
    privacy_level: "anonymous",
    authority_department: "kesehatan",
    status: "submitted"
  }

  @invalid_attrs %{
    category: nil,
    content: nil,
    privacy_level: nil
  }

  describe "public/2 - List public reports" do
    setup [:create_reports]

    test "lists all public reports", %{conn: conn, public_report: public_report} do
      conn = get(conn, ~p"/api/reports/public")
      assert %{"data" => reports} = json_response(conn, 200)

      assert length(reports) >= 1
      assert Enum.any?(reports, fn r -> r["id"] == public_report.id end)
    end

    test "does not list private reports in public endpoint", %{
      conn: conn,
      private_report: private_report
    } do
      conn = get(conn, ~p"/api/reports/public")
      assert %{"data" => reports} = json_response(conn, 200)

      refute Enum.any?(reports, fn r -> r["id"] == private_report.id end)
    end

    test "does not list anonymous reports in public endpoint", %{
      conn: conn,
      anonymous_report: anonymous_report
    } do
      conn = get(conn, ~p"/api/reports/public")
      assert %{"data" => reports} = json_response(conn, 200)

      refute Enum.any?(reports, fn r -> r["id"] == anonymous_report.id end)
    end

    test "filters by department", %{conn: conn} do
      conn = get(conn, ~p"/api/reports/public?department=kebersihan")
      assert %{"data" => reports} = json_response(conn, 200)

      assert Enum.all?(reports, fn r -> r["authority_department"] == "kebersihan" end)
    end

    test "filters by status", %{conn: conn} do
      conn = get(conn, ~p"/api/reports/public?status=submitted")
      assert %{"data" => reports} = json_response(conn, 200)

      assert Enum.all?(reports, fn r -> r["status"] == "submitted" end)
    end
  end

  describe "create/2 - Create report (no auth)" do
    test "creates public report and returns data", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @create_attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["category"] == "sampah"
      assert data["content"] == "Test report content"
      assert data["privacy_level"] == "public"
    end

    test "creates private report", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @private_attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["privacy_level"] == "private"
    end

    test "creates anonymous report", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @anonymous_attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["privacy_level"] == "anonymous"
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/reports", report: @invalid_attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end
  end

  describe "index/2 - List reports (auth required)" do
    setup [:create_reports, :authenticate]

    test "lists all reports for authenticated authority", %{conn: conn} do
      conn = get(conn, ~p"/api/reports")
      assert %{"data" => reports} = json_response(conn, 200)

      assert length(reports) >= 1
      assert Enum.all?(reports, fn r -> r["authority_department"] == "kebersihan" end)
    end

    test "filters by own department", %{conn: conn} do
      conn = get(conn, ~p"/api/reports?department=kebersihan")
      assert %{"data" => reports} = json_response(conn, 200)

      assert Enum.all?(reports, fn r -> r["authority_department"] == "kebersihan" end)
    end

    test "denies access to other department", %{conn: conn} do
      conn = get(conn, ~p"/api/reports?department=kesehatan")
      assert %{"error" => "Access denied"} = json_response(conn, 403)
    end

    test "returns 401 without authentication", %{conn: conn} do
      conn = build_conn() |> get(~p"/api/reports")
      assert json_response(conn, 401)
    end
  end

  describe "show/2 - Get single report (auth required)" do
    setup [:create_reports, :authenticate]

    test "shows report from own department", %{conn: conn, public_report: report} do
      conn = get(conn, ~p"/api/reports/#{report.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == report.id
      assert data["content"] == report.content
    end

    test "denies access to private report from other department", %{conn: conn} do
      # Private/anonymous reports should only be accessible by assigned department
      {:ok, other_report} =
        Reports.create_report(%{
          category: "kesehatan",
          content: "Health report",
          privacy_level: "private",
          authority_department: "kesehatan",
          status: "submitted"
        })

      conn = get(conn, ~p"/api/reports/#{other_report.id}")
      assert %{"error" => "Access denied"} = json_response(conn, 403)
    end

    test "returns 404 for non-existent report", %{conn: conn} do
      conn = get(conn, ~p"/api/reports/00000000-0000-0000-0000-000000000000")
      assert json_response(conn, 404)
    end
  end

  defp create_reports(_) do
    {:ok, public_report} = Reports.create_report(@create_attrs)
    {:ok, private_report} = Reports.create_report(@private_attrs)
    {:ok, anonymous_report} = Reports.create_report(@anonymous_attrs)

    %{
      public_report: public_report,
      private_report: private_report,
      anonymous_report: anonymous_report
    }
  end

  defp authenticate(%{conn: conn}) do
    %{conn: authenticate_as_authority(conn, "kebersihan")}
  end
end
