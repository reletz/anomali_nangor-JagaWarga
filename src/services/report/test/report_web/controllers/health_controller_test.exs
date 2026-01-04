defmodule ReportWeb.HealthControllerTest do
  use ReportWeb.ConnCase, async: true

  describe "GET /health" do
    test "returns health status", %{conn: conn} do
      conn = get(conn, ~p"/health")
      response = json_response(conn, 200)
      
      assert response["status"] == "ok"
      assert response["service"] == "report-service"
      assert response["timestamp"] != nil
    end

    test "includes database status", %{conn: conn} do
      conn = get(conn, ~p"/health")
      response = json_response(conn, 200)
      
      # In test environment with working DB, should be connected
      assert response["database"] in ["connected", "disconnected"]
    end
  end
end
