defmodule ReportWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  are reverted at the end of every test. If you are using
  PostgreSQL, you can even run database tests asynchronously
  by setting `use ReportWeb.ConnCase, async: true`, although
  this option is not recommended for other databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # The default endpoint for testing
      @endpoint ReportWeb.Endpoint

      use ReportWeb, :verified_routes

      # Import conveniences for testing with connections
      import Plug.Conn
      import Phoenix.ConnTest
      import ReportWeb.ConnCase
    end
  end

  setup tags do
    Report.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  def authenticate_as_authority(conn, department \\ "kebersihan") do
    user = %{
      "id" => "test-authority-#{department}",
      "department" => department,
      "email" => "#{department}@bandung.go.id"
    }

    conn
    |> Plug.Conn.assign(:current_user, user)
  end

  generate_test_token(department \\ "kebersihan") do
    "test-token-#{department}-#{:erlang.unique_integer()}"
  end
end
