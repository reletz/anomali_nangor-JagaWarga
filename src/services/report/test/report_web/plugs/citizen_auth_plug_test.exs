defmodule ReportWeb.CitizenAuthPlugTest do
  use ExUnit.Case, async: true
  import Plug.Conn
  import Plug.Test

  test "a citizen with a null department remains a citizen" do
    conn =
      conn(:get, "/api/my-reports")
      |> assign(:current_user, %{"id" => "citizen-id", "role" => "citizen", "department" => nil})
      |> ReportWeb.Plugs.CitizenAuthPlug.call([])

    refute conn.halted
  end

  test "an authority cannot use citizen endpoints" do
    conn =
      conn(:get, "/api/my-reports")
      |> assign(:current_user, %{
        "id" => "authority-id",
        "role" => "authority",
        "department" => "keamanan"
      })
      |> ReportWeb.Plugs.CitizenAuthPlug.call([])

    assert conn.status == 403
    assert conn.halted
  end
end
