defmodule ReportWeb.LiveTest do
  use ExUnit.Case, async: true
  import Plug.Test

  test "liveness does not require a database" do
    conn = conn(:get, "/live")
    response = ReportWeb.HealthController.live(conn, %{})
    assert response.status == 200
    assert Jason.decode!(response.resp_body)["status"] == "ok"
  end
end
